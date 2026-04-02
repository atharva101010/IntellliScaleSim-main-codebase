"""
Billing API Routes - Resource Quotas & Billing Simulation
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta, timezone

from app.database.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.container import Container
from app.models.billing_models import PricingProvider, PricingModel
from app.services.billing_service import BillingService
from app.services.docker_service import DockerService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


# Request/Response Models
class RealTimeBillingRequest(BaseModel):
    container_id: int
    provider: PricingProvider = Field(default=PricingProvider.aws)
    hours_back: float = Field(default=1.0, gt=0, le=720)  # Max 30 days


class ScenarioSimulationRequest(BaseModel):
    cpu_cores: float = Field(ge=0.5, le=64)
    memory_gb: float = Field(ge=0.5, le=256)
    storage_gb: float = Field(ge=1, le=10000)
    duration_hours: float = Field(ge=0.1, le=8760)  # Max 1 year
    provider: PricingProvider = Field(default=PricingProvider.aws)


class CollectMetricsRequest(BaseModel):
    container_id: int


@router.get("/pricing-models")
def get_pricing_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all cloud provider pricing models"""
    billing_service = BillingService(db)
    
    # Ensure pricing models are initialized
    billing_service.initialize_pricing_models()
    
    models = db.query(PricingModel).all()
    
    return {
        "pricing_models": [
            {
                "provider": model.provider_name.value,
                "cpu_per_hour": float(model.cpu_per_hour),
                "memory_per_gb_hour": float(model.memory_per_gb_hour),
                "storage_per_gb_month": float(model.storage_per_gb_month),
                "storage_ssd_per_gb_month": float(model.storage_ssd_per_gb_month) if model.storage_ssd_per_gb_month else None,
                "storage_hdd_per_gb_month": float(model.storage_hdd_per_gb_month) if model.storage_hdd_per_gb_month else None,
            }
            for model in models
        ]
    }


@router.post("/collect-metrics")
async def collect_and_save_metrics(
    request: CollectMetricsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Collect and save current resource metrics for a container"""
    # Verify container belongs to user
    container = (
        db.query(Container)
        .filter(Container.id == request.container_id, Container.user_id == current_user.id)
        .first()
    )
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    billing_service = BillingService(db)
    metrics = await billing_service.collect_container_metrics(container)
    
    if not metrics:
        raise HTTPException(
            status_code=400,
            detail="Unable to collect metrics. Container may not be running."
        )
    
    # Save metrics to database
    usage = billing_service.save_resource_usage(container.id, metrics)
    
    return {
        "message": "Metrics collected successfully",
        "metrics": {
            "timestamp": metrics["timestamp"].isoformat(),
            "cpu_percent": metrics["cpu_percent"],
            "cpu_cores_used": metrics["cpu_cores_used"],
            "memory_mb": metrics["memory_mb"],
            "memory_gb": metrics["memory_gb"],
            "storage_gb": metrics.get("storage_gb", 0),
        }
    }


@router.post("/real-time/calculate")
async def calculate_real_time_billing(
    request: RealTimeBillingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate real-time billing for a container"""
    # Verify container belongs to user
    container = (
        db.query(Container)
        .filter(Container.id == request.container_id, Container.user_id == current_user.id)
        .first()
    )
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    billing_service = BillingService(db)
    
    try:
        billing_data = await billing_service.calculate_real_time_billing(
            container_id=request.container_id,
            hours_back=request.hours_back,
            provider=request.provider,
        )
        
        if "error" in billing_data:
            raise HTTPException(status_code=400, detail=billing_data["error"])
        
        return {
            "success": True,
            "container": {
                "id": container.id,
                "name": container.name,
                "status": container.status.value,
            },
            "billing": billing_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating real-time billing: {e}")
        raise HTTPException(status_code=500, detail=f"Billing calculation failed: {str(e)}")


@router.post("/scenario/simulate")
def simulate_scenario_billing(
    request: ScenarioSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simulate billing for a hypothetical resource scenario"""
    billing_service = BillingService(db)
    
    try:
        simulation = billing_service.simulate_scenario_cost(
            cpu_cores=request.cpu_cores,
            memory_gb=request.memory_gb,
            storage_gb=request.storage_gb,
            duration_hours=request.duration_hours,
            provider=request.provider,
        )
        
        return {
            "success": True,
            "simulation": simulation,
        }
    
    except Exception as e:
        logger.error(f"Error simulating scenario: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/usage-history/{container_id}")
def get_usage_history(
    container_id: int,
    hours_back: float = Query(default=24.0, gt=0, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical resource usage data for a container"""
    # Verify container belongs to user
    container = (
        db.query(Container)
        .filter(Container.id == container_id, Container.user_id == current_user.id)
        .first()
    )
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    billing_service = BillingService(db)
    
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=hours_back)
    
    usage_records = billing_service.get_usage_history(container_id, start_time, end_time)
    
    return {
        "container_id": container_id,
        "time_range": {
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "hours": hours_back,
        },
        "usage_count": len(usage_records),
        "usage_history": [
            {
                "timestamp": record.timestamp.isoformat(),
                "cpu_percent": record.cpu_percent,
                "cpu_cores_used": record.cpu_cores_used or 0,
                "memory_mb": record.memory_mb,
                "memory_gb": record.memory_gb or 0,
                "storage_gb": record.storage_gb or 0,
            }
            for record in usage_records
        ],
    }


@router.get("/containers")
def get_user_containers_for_billing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all user containers with their current status for billing selection"""
    containers = (
        db.query(Container)
        .filter(Container.user_id == current_user.id)
        .order_by(Container.created_at.desc())
        .all()
    )
    
    return {
        "containers": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status.value,
                "image": c.image,
                "deployment_type": c.deployment_type,
                "cpu_limit": c.cpu_limit,
                "memory_limit": c.memory_limit,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "started_at": c.started_at.isoformat() if c.started_at else None,
            }
            for c in containers
        ]
    }
