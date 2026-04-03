from datetime import datetime, timezone
import shutil
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.database.session import get_db
from app.models.container import Container
from app.models.user import User, UserRole
from app.services.docker_service import get_docker_service


router = APIRouter(prefix="/admin", tags=["admin"])


class AdminUserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_verified: bool
    created_at: datetime
    containers_count: int
    status: str
    last_login: Optional[datetime] = None


class AdminUserRoleUpdate(BaseModel):
    role: UserRole


class AdminSystemService(BaseModel):
    id: str
    name: str
    status: str
    uptime: str
    cpu: float
    memory: float
    last_check: str


class AdminSystemMetrics(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_in: float
    network_out: float
    active_connections: int
    request_rate: float
    error_rate: float


class AdminSystemOverview(BaseModel):
    services: List[AdminSystemService]
    metrics: AdminSystemMetrics


SERVICE_MAP = [
    {"id": "api-server", "name": "API Server", "container": "intelliscale-backend"},
    {"id": "database", "name": "PostgreSQL Database", "container": "intelliscale-postgres"},
    {"id": "docker-engine", "name": "Docker Engine", "container": ""},
    {"id": "redis", "name": "Redis Cache", "container": "intelliscale-redis"},
    {"id": "prometheus", "name": "Prometheus", "container": "intelliscale-prometheus"},
    {"id": "grafana", "name": "Grafana", "container": "intelliscale-grafana"},
    {"id": "nginx", "name": "NGINX Proxy", "container": "intelliscale-frontend"},
    {"id": "autoscaler", "name": "Auto-Scaler Service", "container": "intelliscale-backend"},
]


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _format_uptime(started_at: Optional[datetime]) -> str:
    if not started_at:
        return "N/A"

    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)

    delta = datetime.now(timezone.utc) - started_at
    total_seconds = int(max(delta.total_seconds(), 0))
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60

    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    return f"{hours}h {minutes}m"


def _parse_started_at(raw_started_at: Optional[str]) -> Optional[datetime]:
    if not raw_started_at:
        return None

    value = raw_started_at.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _parse_stats(stats: Dict[str, Any]) -> Dict[str, float]:
    cpu_stats = stats.get("cpu_stats", {})
    precpu_stats = stats.get("precpu_stats", {})

    cpu_usage = cpu_stats.get("cpu_usage", {})
    precpu_usage = precpu_stats.get("cpu_usage", {})

    cpu_delta = cpu_usage.get("total_usage", 0) - precpu_usage.get("total_usage", 0)
    system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)

    online_cpus = cpu_stats.get("online_cpus") or len(cpu_usage.get("percpu_usage") or []) or 1

    cpu_percent = 0.0
    if system_delta > 0 and cpu_delta > 0:
        cpu_percent = (cpu_delta / system_delta) * online_cpus * 100.0

    memory_stats = stats.get("memory_stats", {})
    memory_usage = float(memory_stats.get("usage", 0) or 0)
    memory_limit = float(memory_stats.get("limit", 0) or 0)
    memory_percent = (memory_usage / memory_limit * 100.0) if memory_limit > 0 else 0.0

    network_rx = 0
    network_tx = 0
    for network in (stats.get("networks") or {}).values():
        network_rx += int(network.get("rx_bytes", 0) or 0)
        network_tx += int(network.get("tx_bytes", 0) or 0)

    return {
        "cpu": round(max(cpu_percent, 0.0), 2),
        "memory": round(max(memory_percent, 0.0), 2),
        "network_in": round(network_rx / (1024 * 1024), 2),
        "network_out": round(network_tx / (1024 * 1024), 2),
    }


def _service_from_container(client, service_spec: Dict[str, str], now_iso: str) -> AdminSystemService:
    service_id = str(service_spec["id"])
    service_name = str(service_spec["name"])
    container_name = str(service_spec["container"])

    if service_id == "docker-engine":
        docker_status = get_docker_service().get_docker_status()
        status_value = "running" if docker_status.get("available") else "error"
        return AdminSystemService(
            id=service_id,
            name=service_name,
            status=status_value,
            uptime="N/A",
            cpu=0.0,
            memory=0.0,
            last_check=now_iso,
        )

    if client is None or not container_name:
        return AdminSystemService(
            id=service_id,
            name=service_name,
            status="error",
            uptime="N/A",
            cpu=0.0,
            memory=0.0,
            last_check=now_iso,
        )

    try:
        container = client.containers.get(container_name)
        state = container.attrs.get("State", {})
        started_at = _parse_started_at(state.get("StartedAt"))
        raw_stats = container.stats(stream=False)
        if not isinstance(raw_stats, dict):
            raw_stats = next(raw_stats, {})

        stats = _parse_stats(raw_stats)

        if state.get("Running"):
            status_value = "running"
        elif state.get("Status") == "exited":
            status_value = "stopped"
        else:
            status_value = "degraded"

        return AdminSystemService(
            id=service_id,
            name=service_name,
            status=status_value,
            uptime=_format_uptime(started_at),
            cpu=stats["cpu"],
            memory=stats["memory"],
            last_check=now_iso,
        )
    except Exception:
        return AdminSystemService(
            id=service_id,
            name=service_name,
            status="stopped",
            uptime="N/A",
            cpu=0.0,
            memory=0.0,
            last_check=now_iso,
        )


def _check_http_service(url: str) -> bool:
    try:
        with httpx.Client(timeout=2.5) as client:
            response = client.get(url)
            return 200 <= response.status_code < 500
    except Exception:
        return False


@router.get("/users", response_model=List[AdminUserResponse])
def list_users(
    _current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    containers_per_user = {
        int(user_id): int(count)
        for user_id, count in db.query(Container.user_id, func.count(Container.id))
        .group_by(Container.user_id)
        .all()
    }

    users = db.query(User).order_by(User.created_at.desc()).all()

    responses: List[AdminUserResponse] = []
    for user in users:
        role = _role_value(user)
        user_status = "active" if user.is_verified else "pending"
        responses.append(
            AdminUserResponse(
                id=user.id,
                name=user.name,
                email=user.email,
                role=role,
                is_verified=bool(user.is_verified),
                created_at=user.created_at,
                containers_count=int(containers_per_user.get(user.id, 0)),
                status=user_status,
                last_login=None,
            )
        )

    return responses


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
def update_user_role(
    user_id: int,
    payload: AdminUserRoleUpdate,
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id and payload.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot remove own admin role")

    user.role = payload.role
    db.commit()
    db.refresh(user)

    user_status = "active" if user.is_verified else "pending"
    containers_count = db.query(func.count(Container.id)).filter(Container.user_id == user.id).scalar() or 0

    return AdminUserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=_role_value(user),
        is_verified=bool(user.is_verified),
        created_at=user.created_at,
        containers_count=int(containers_count),
        status=user_status,
        last_login=None,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot delete own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return None


@router.get("/systems/overview", response_model=AdminSystemOverview)
async def systems_overview(
    _current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    now_iso = datetime.now(timezone.utc).isoformat()

    docker_client = None
    try:
        docker_client = get_docker_service()._get_client()
    except Exception:
        docker_client = None

    services = [_service_from_container(docker_client, spec, now_iso) for spec in SERVICE_MAP]

    # Refine Prometheus/Grafana health with direct HTTP checks when available.
    for service in services:
        if service.id == "prometheus" and service.status == "running":
            if not _check_http_service("http://localhost:9090/-/healthy"):
                service.status = "degraded"
        if service.id == "grafana" and service.status == "running":
            if not _check_http_service("http://localhost:3500/api/health"):
                service.status = "degraded"

    running_services = [s for s in services if s.status == "running"]
    cpu_usage = round(sum(s.cpu for s in running_services) / len(running_services), 2) if running_services else 0.0
    memory_usage = round(sum(s.memory for s in running_services) / len(running_services), 2) if running_services else 0.0

    disk = shutil.disk_usage("/")
    disk_usage = round((disk.used / disk.total) * 100.0, 2) if disk.total else 0.0

    total_network_in = 0.0
    total_network_out = 0.0
    if docker_client is not None:
        for spec in SERVICE_MAP:
            container_name = spec.get("container")
            if not container_name:
                continue
            try:
                raw_stats = docker_client.containers.get(container_name).stats(stream=False)
                if not isinstance(raw_stats, dict):
                    raw_stats = next(raw_stats, {})

                stats = _parse_stats(raw_stats)
                total_network_in += stats["network_in"]
                total_network_out += stats["network_out"]
            except Exception:
                continue

    total_containers = db.query(func.count(Container.id)).scalar() or 0
    error_services = [s for s in services if s.status in {"error", "stopped"}]
    error_rate = round((len(error_services) / len(services)) * 100.0, 2) if services else 0.0

    metrics = AdminSystemMetrics(
        cpu_usage=cpu_usage,
        memory_usage=memory_usage,
        disk_usage=disk_usage,
        network_in=round(total_network_in, 2),
        network_out=round(total_network_out, 2),
        active_connections=int(total_containers),
        request_rate=0.0,
        error_rate=error_rate,
    )

    return AdminSystemOverview(services=services, metrics=metrics)
