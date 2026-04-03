import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.scaling_policy import ScalingPolicy, ScalingEvent
from app.models.container import Container, ContainerStatus
from app.services.docker_service import DockerService

logger = logging.getLogger(__name__)

HTTP_PORT_HINTS = {80, 81, 3000, 3001, 4000, 5000, 5173, 8000, 8080, 8081, 8888, 9000}
HTTPS_PORT_HINTS = {443, 8443, 9443}


def _build_service_url(port: Optional[int], internal_port: Optional[int]) -> Optional[str]:
    if not port or not internal_port:
        return None

    if internal_port in HTTPS_PORT_HINTS:
        return f"https://localhost:{port}"

    if internal_port in HTTP_PORT_HINTS:
        return f"http://localhost:{port}"

    return None


class AutoScalerService:
    """
    Core auto-scaling service
    Evaluates policies and makes scaling decisions
    """
    
    def __init__(self, db: Session, docker_service: DockerService):
        self.db = db
        self.docker_service = docker_service

    def _cleanup_stale_policy_reference(
        self,
        policy: ScalingPolicy,
        container: Optional[Container],
        reason: str,
    ) -> None:
        """Disable stale policy references and mark non-simulated containers as stopped."""
        now = datetime.now(timezone.utc)

        if policy.enabled:
            policy.enabled = False
            policy.updated_at = now

        if container and container.deployment_type != "simulated":
            container.status = ContainerStatus.stopped
            container.stopped_at = now
            container.container_id = None

        self.db.commit()

        target_container_id = container.id if container else policy.container_id
        logger.warning(
            f"Disabled stale scaling policy {policy.id} for container {target_container_id}: {reason}"
        )
    
    def _ensure_utc_aware(self, dt: datetime) -> datetime:
        """Ensure datetime is timezone-aware (UTC)"""
        if dt is None:
            return None
        try:
            if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
                return dt.replace(tzinfo=timezone.utc)
        except Exception:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    
    def get_current_replica_count(self, container_id: int) -> int:
        """Get current number of replicas for a container"""
        # Count running containers with this container as parent, plus the parent itself
        replicas = self.db.query(Container).filter(
            Container.parent_id == container_id,
            Container.status == ContainerStatus.running
        ).count()
        
        # Include the parent container itself
        parent = self.db.query(Container).filter(Container.id == container_id).first()
        if parent and parent.status == ContainerStatus.running:
            replicas += 1
            
        return replicas

    def _find_available_replica_port(self, start_port: int) -> int:
        """Find the next free host port for a replica container."""
        used_ports = {
            port
            for (port,) in self.db.query(Container.port).filter(Container.port.isnot(None)).all()
        }
        candidate = start_port
        while candidate in used_ports:
            candidate += 1
        return candidate
    
    async def get_container_metrics(self, container_id: int) -> Optional[dict]:
        """Get current CPU and memory metrics for a container"""
        try:
            container = self.db.query(Container).filter(Container.id == container_id).first()
            if not container:
                return None
            
            # For real Docker containers
            if container.container_id:
                if not self.docker_service.container_exists(container.container_id):
                    logger.info(
                        f"Skipping metrics for missing Docker container id {container.container_id[:12]} (container {container.id})"
                    )
                    return None
                try:
                    stats = await self.docker_service.get_container_stats_async(container.container_id)
                    # Convert stats to the format expected by autoscaler
                    # Docker stats returns memory_usage_mb, we need memory_percent
                    mem_limit = container.memory_limit or 512
                    mem_percent = (stats.get('memory_usage_mb', 0) / mem_limit) * 100
                    
                    return {
                        'cpu_percent': stats.get('cpu_percent', 0),
                        'memory_percent': mem_percent
                    }
                except Exception as stats_err:
                    logger.warning(f"Failed to get real stats for container {container_id}: {stats_err}")

            # No runtime stats are available for non-Docker/simulated containers.
            # Keep this deterministic to avoid fake scaling activity.
            return {
                'cpu_percent': 0.0,
                'memory_percent': 0.0
            }
            
        except Exception as e:
            logger.error(f"Error getting metrics for container {container_id}: {e}")
            return None
    
    def should_scale_up(self, policy: ScalingPolicy, metrics: dict, current_replicas: int) -> tuple[bool, str]:
        """Determine if should scale up"""
        if not policy.enabled:
            return False, "policy_disabled"
        
        if current_replicas >= policy.max_replicas:
            return False, "max_replicas_reached"
        
        # Check cooldown period
        if policy.last_scaled_at:
            last_scaled = self._ensure_utc_aware(policy.last_scaled_at)
            time_since_scale = (datetime.now(timezone.utc) - last_scaled).total_seconds()
            if time_since_scale < policy.cooldown_period:
                return False, "cooldown_active"
        
        # Check CPU threshold
        cpu_val = metrics.get('cpu_percent', 0)
        if cpu_val >= policy.scale_up_cpu_threshold:
            return True, "cpu"
        
        # Check memory threshold
        mem_val = metrics.get('memory_percent', 0)
        if mem_val >= policy.scale_up_memory_threshold:
            return True, "memory"
        
        return False, "thresholds_not_met"
    
    def should_scale_down(self, policy: ScalingPolicy, metrics: dict, current_replicas: int) -> tuple[bool, str]:
        """Determine if should scale down"""
        if not policy.enabled:
            return False, "policy_disabled"
        
        if current_replicas <= policy.min_replicas:
            return False, "min_replicas_reached"
        
        # Check cooldown period
        if policy.last_scaled_at:
            last_scaled = self._ensure_utc_aware(policy.last_scaled_at)
            time_since_scale = (datetime.now(timezone.utc) - last_scaled).total_seconds()
            if time_since_scale < policy.cooldown_period:
                return False, "cooldown_active"
        
        # Check both CPU and memory are below thresholds
        cpu_val = metrics.get('cpu_percent', 0)
        mem_val = metrics.get('memory_percent', 0)
        if (cpu_val < policy.scale_down_cpu_threshold and 
            mem_val < policy.scale_down_memory_threshold):
            return True, "both_low"
        
        return False, "thresholds_not_met"
    
    def scale_up(self, policy: ScalingPolicy, trigger_metric: str, metric_value: float) -> bool:
        """Scale up by creating a new replica"""
        try:
            current_replicas = self.get_current_replica_count(policy.container_id)
            
            # Get parent container
            parent = self.db.query(Container).filter(Container.id == policy.container_id).first()
            if not parent:
                logger.error(f"Parent container {policy.container_id} not found")
                return False

            if not parent.image:
                logger.error(f"Parent container {policy.container_id} has no image configured")
                return False
            
            # Create new replica container record
            replica_name = f"intelliscale-{parent.id}-{parent.name}-replica-{current_replicas}"
            
            # Find available port by scanning from the parent's neighborhood.
            external_port = self._find_available_replica_port((parent.port or 5000) + 1)

            internal_port = self.docker_service.detect_internal_port(parent.image)
            keepalive_command = None
            run_port = external_port if internal_port else None

            if internal_port is None and self.docker_service.should_use_keepalive_command(parent.image):
                keepalive_command = ["sh", "-c", "while true; do sleep 3600; done"]
                logger.info(
                    f"Applying keepalive command for replica image '{parent.image}' to prevent immediate exit"
                )

            cpu_millicores = parent.cpu_limit or 500
            cpu_limit_cores = max(cpu_millicores, 100) / 1000.0
            mem_limit_mb = parent.memory_limit or 512

            logger.info(
                f"Scaling up: Creating Docker container {replica_name} on external port {run_port}, internal port {internal_port}"
            )
            
            try:
                docker_container_id = self.docker_service.run_container(
                    image=parent.image,
                    name=replica_name,
                    port=run_port,
                    internal_port=internal_port,
                    cpu_limit=f"{cpu_limit_cores}",
                    mem_limit=f"{int(mem_limit_mb)}m",
                    command=keepalive_command,
                )

                runtime_status = self.docker_service.wait_for_container_running(docker_container_id, timeout_seconds=8)
                if not runtime_status.get("running"):
                    logger.error(f"Scaled replica container exited immediately: {replica_name}")
                    try:
                        self.docker_service.remove_container(docker_container_id, force=True)
                    except Exception:
                        pass
                    return False
            except Exception as docker_err:
                logger.error(f"Docker scale up failed: {docker_err}")
                return False

            new_replica = Container(
                name=f"{parent.name}-replica-{current_replicas}",
                image=parent.image,
                port=run_port,
                container_id=docker_container_id,
                status=ContainerStatus.running,
                user_id=parent.user_id,
                parent_id=parent.id,
                deployment_type=parent.deployment_type,
                cpu_limit=cpu_millicores,
                memory_limit=mem_limit_mb,
                environment_vars=parent.environment_vars,
                localhost_url=_build_service_url(run_port, internal_port),
                started_at=datetime.now(timezone.utc)
            )
            
            self.db.add(new_replica)
            
            # Log scaling event
            event = ScalingEvent(
                policy_id=policy.id,
                container_id=policy.container_id,
                action='scale_up',
                trigger_metric=trigger_metric,
                metric_value=metric_value,
                replica_count_before=current_replicas,
                replica_count_after=current_replicas + 1
            )
            self.db.add(event)
            
            # Update policy
            policy.last_scaled_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            logger.info(f"Successfully scaled up container {policy.container_id}: {current_replicas} → {current_replicas + 1}")
            return True
            
        except Exception as e:
            logger.error(f"Error scaling up: {e}")
            self.db.rollback()
            return False
    
    def scale_down(self, policy: ScalingPolicy, trigger_metric: str, metric_value: float) -> bool:
        """Scale down by removing a replica"""
        try:
            current_replicas = self.get_current_replica_count(policy.container_id)
            
            # Find newest replica to remove
            replica = self.db.query(Container).filter(
                Container.parent_id == policy.container_id,
                Container.status == ContainerStatus.running
            ).order_by(Container.created_at.desc()).first()
            
            if not replica:
                logger.warning(f"No replicas found to scale down for container {policy.container_id}")
                return False
            
            # Stop and remove replica
            if replica.container_id:
                try:
                    logger.info(f"Scaling down: Stopping and removing Docker container {replica.container_id[:12]}")
                    self.docker_service.stop_container(replica.container_id)
                    self.docker_service.remove_container(replica.container_id)
                except Exception as docker_err:
                    logger.warning(f"Failed to remove Docker container during scale down: {docker_err}")
            
            replica.status = ContainerStatus.stopped
            replica.stopped_at = datetime.now(timezone.utc)
            
            # Log scaling event
            event = ScalingEvent(
                policy_id=policy.id,
                container_id=policy.container_id,
                action='scale_down',
                trigger_metric=trigger_metric,
                metric_value=metric_value,
                replica_count_before=current_replicas,
                replica_count_after=current_replicas - 1
            )
            self.db.add(event)
            
            # Update policy
            policy.last_scaled_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            logger.info(f"Scaled down container {policy.container_id}: {current_replicas} → {current_replicas - 1}")
            return True
            
        except Exception as e:
            logger.error(f"Error scaling down: {e}")
            self.db.rollback()
            return False
    
    async def evaluate_policy(self, policy: ScalingPolicy) -> None:
        """Evaluate a single policy and take action if needed"""
        try:
            container = self.db.query(Container).filter(Container.id == policy.container_id).first()
            if not container:
                self._cleanup_stale_policy_reference(policy, None, "container_record_missing")
                return

            if container.status != ContainerStatus.running:
                logger.debug(
                    f"Skipping policy {policy.id}: container {container.id} status is {container.status}"
                )
                return

            if container.deployment_type != "simulated":
                if not container.container_id:
                    self._cleanup_stale_policy_reference(policy, container, "container_id_missing")
                    return

                if not self.docker_service.container_exists(container.container_id):
                    self._cleanup_stale_policy_reference(policy, container, "docker_container_missing")
                    return

            # Get current metrics
            metrics = await self.get_container_metrics(policy.container_id)
            if not metrics:
                logger.debug(f"No metrics available for container {policy.container_id}")
                return
            
            cpu_val = metrics.get('cpu_percent', 0)
            mem_val = metrics.get('memory_percent', 0)
            logger.info(f"📊 Policy {policy.id} Evaluation: Container {policy.container_id} | CPU: {cpu_val}% (Target: {policy.scale_up_cpu_threshold}%) | Mem: {mem_val}%")
            
            current_replicas = self.get_current_replica_count(policy.container_id)
            
            # Check if should scale up
            should_scale_up, reason = self.should_scale_up(policy, metrics, current_replicas)
            if should_scale_up:
                metric_key = f"{reason}_percent"
                logger.info(f"Scaling up container {policy.container_id} due to {reason}: {metrics[metric_key]}%")
                self.scale_up(policy, reason, metrics[metric_key])
                return
            
            # Check if should scale down
            should_scale_down, reason = self.should_scale_down(policy, metrics, current_replicas)
            if should_scale_down:
                logger.info(f"Scaling down container {policy.container_id} due to low resource usage")
                self.scale_down(policy, "both_low", min(metrics['cpu_percent'], metrics['memory_percent']))
                return
            
            logger.debug(f"No scaling action needed for container {policy.container_id}")
            
        except Exception as e:
            logger.error(f"Error evaluating policy {policy.id}: {e}")
    
    async def evaluate_all_policies(self) -> None:
        """Evaluate all enabled policies"""
        try:
            policies = self.db.query(ScalingPolicy).filter(ScalingPolicy.enabled == True).all()
            logger.info(f"Evaluating {len(policies)} active scaling policies")
            
            for policy in policies:
                await self.evaluate_policy(policy)
                
        except Exception as e:
            logger.error(f"Error in evaluate_all_policies: {e}")


# Global instance (will be initialized in main.py)
autoscaler_service: Optional[AutoScalerService] = None
