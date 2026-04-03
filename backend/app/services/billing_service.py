"""
Billing Service - Calculate costs and track resource usage for billing simulation
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.billing_models import (
    ResourceQuota, ResourceUsage, BillingSnapshot, 
    PricingModel, PricingProvider
)
from app.models.container import Container
from app.services.docker_service import DockerService, get_docker_service
import logging

logger = logging.getLogger(__name__)


# Default pricing rates based on 2026 cloud provider research
DEFAULT_PRICING = {
    PricingProvider.aws: {
        "cpu_per_hour": 0.05,
        "memory_per_gb_hour": 0.01,
        "storage_per_gb_month": 0.08,
        "storage_ssd_per_gb_month": 0.08,
        "storage_hdd_per_gb_month": 0.045,
    },
    PricingProvider.gcp: {
        "cpu_per_hour": 0.0335,
        "memory_per_gb_hour": 0.0045,
        "storage_per_gb_month": 0.10,
        "storage_ssd_per_gb_month": 0.17,
        "storage_hdd_per_gb_month": 0.04,
    },
    PricingProvider.azure: {
        "cpu_per_hour": 0.048,
        "memory_per_gb_hour": 0.0062,
        "storage_per_gb_month": 0.10,
        "storage_ssd_per_gb_month": 0.143,
        "storage_hdd_per_gb_month": 0.05,
    },
}


class BillingService:
    """Service for billing calculations and resource tracking"""

    def __init__(self, db: Session, docker_service: Optional[DockerService] = None):
        self.db = db
        self.docker_service = docker_service or get_docker_service()

    def initialize_pricing_models(self):
        """Initialize default pricing models in database if not exist"""
        for provider, rates in DEFAULT_PRICING.items():
            existing = self.db.query(PricingModel).filter(
                PricingModel.provider_name == provider
            ).first()
            
            if not existing:
                pricing_model = PricingModel(
                    provider_name=provider,
                    cpu_per_hour=rates["cpu_per_hour"],
                    memory_per_gb_hour=rates["memory_per_gb_hour"],
                    storage_per_gb_month=rates["storage_per_gb_month"],
                    storage_ssd_per_gb_month=rates.get("storage_ssd_per_gb_month"),
                    storage_hdd_per_gb_month=rates.get("storage_hdd_per_gb_month"),
                )
                self.db.add(pricing_model)
        
        self.db.commit()
        logger.info("✅ Pricing models initialized")

    def get_pricing_model(self, provider: PricingProvider) -> Optional[PricingModel]:
        """Get pricing model for a specific provider"""
        return self.db.query(PricingModel).filter(
            PricingModel.provider_name == provider
        ).first()

    async def collect_container_metrics(self, container: Container) -> Optional[Dict]:
        """Collect current resource metrics from a running container"""
        status = container.status.value if hasattr(container.status, "value") else str(container.status)
        if not container.container_id or status != "running":
            logger.debug(f"Container {container.id} is not in running state for metrics. Status: {status}")
            return None

        try:
            stats = await self.docker_service.get_container_stats_async(container.container_id)
            if not stats:
                return None

            # Calculate CPU usage
            cpu_percent = stats.get("cpu_percent", 0.0)
            cpu_cores_used = cpu_percent / 100.0  # Approximate cores used

            # Get memory usage
            memory_mb = stats.get("memory_usage_mb", 0.0)
            memory_gb = memory_mb / 1024.0

            # Network stats
            network_rx = stats.get("network_rx_bytes", 0)
            network_tx = stats.get("network_tx_bytes", 0)

            # Storage (simplified - use container limit as allocated storage)
            storage_gb = (container.memory_limit or 0) / 1024.0  # Placeholder estimate

            metrics = {
                "cpu_percent": cpu_percent,
                "cpu_cores_used": cpu_cores_used,
                "memory_mb": memory_mb,
                "memory_gb": memory_gb,
                "storage_gb": storage_gb,
                "network_rx_bytes": network_rx,
                "network_tx_bytes": network_tx,
                "timestamp": datetime.now(timezone.utc),
            }

            return metrics

        except Exception as e:
            logger.error(f"Error collecting metrics for container {container.id}: {e}")
            return None

    def save_resource_usage(self, container_id: int, metrics: Dict) -> ResourceUsage:
        """Save resource usage snapshot to database"""
        usage = ResourceUsage(
            container_id=container_id,
            timestamp=metrics["timestamp"],
            cpu_percent=metrics["cpu_percent"],
            cpu_cores_used=metrics.get("cpu_cores_used", 0.0),
            memory_mb=metrics["memory_mb"],
            memory_gb=metrics["memory_gb"],
            storage_gb=metrics.get("storage_gb", 0.0),
            network_rx_bytes=metrics.get("network_rx_bytes", 0),
            network_tx_bytes=metrics.get("network_tx_bytes", 0),
        )
        self.db.add(usage)
        self.db.commit()
        self.db.refresh(usage)
        return usage

    def get_usage_history(
        self, 
        container_id: int, 
        start_time: datetime, 
        end_time: datetime
    ) -> List[ResourceUsage]:
        """Get historical resource usage data for a container"""
        return (
            self.db.query(ResourceUsage)
            .filter(
                ResourceUsage.container_id == container_id,
                ResourceUsage.timestamp >= start_time,
                ResourceUsage.timestamp <= end_time,
            )
            .order_by(ResourceUsage.timestamp.asc())
            .all()
        )

    def calculate_cost(
        self,
        cpu_cores: float,
        memory_gb: float,
        storage_gb: float,
        duration_hours: float,
        provider: PricingProvider = PricingProvider.aws,
    ) -> Dict[str, float]:
        """
        Calculate costs based on resource usage and duration
        
        Args:
            cpu_cores: Number of CPU cores used
            memory_gb: Memory in GB
            storage_gb: Storage in GB
            duration_hours: Duration in hours
            provider: Cloud provider pricing model
        
        Returns:
            Dictionary with cost breakdown
        """
        pricing = self.get_pricing_model(provider)
        if not pricing:
            # Fallback to defaults
            pricing_rates = DEFAULT_PRICING[provider]
            cpu_rate = pricing_rates["cpu_per_hour"]
            memory_rate = pricing_rates["memory_per_gb_hour"]
            storage_rate = pricing_rates["storage_per_gb_month"]
        else:
            cpu_rate = float(pricing.cpu_per_hour)
            memory_rate = float(pricing.memory_per_gb_hour)
            storage_rate = float(pricing.storage_per_gb_month)

        # Calculate costs
        cpu_cost = cpu_cores * duration_hours * cpu_rate
        memory_cost = memory_gb * duration_hours * memory_rate
        
        # Storage is charged monthly, so prorate for actual duration
        # Convert hours to fraction of month (assuming 730 hours per month)
        month_fraction = duration_hours / 730.0
        storage_cost = storage_gb * month_fraction * storage_rate

        total_cost = cpu_cost + memory_cost + storage_cost

        return {
            "cpu_cost": round(cpu_cost, 4),
            "memory_cost": round(memory_cost, 4),
            "storage_cost": round(storage_cost, 4),
            "total_cost": round(total_cost, 4),
            "provider": provider.value,
        }

    async def calculate_real_time_billing(
        self,
        container_id: int,
        hours_back: float = 1.0,
        provider: PricingProvider = PricingProvider.aws,
    ) -> Dict:
        """
        Calculate real-time billing for a container based on recent usage
        
        Args:
            container_id: Container ID
            hours_back: How many hours back to calculate (default 1 hour)
            provider: Cloud provider pricing model
        
        Returns:
            Dictionary with usage metrics and cost breakdown
        """
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=hours_back)

        # Get usage history
        usage_records = self.get_usage_history(container_id, start_time, end_time)

        if not usage_records:
            return {
                "error": "No usage data found for this time period",
                "container_id": container_id,
            }

        # Calculate average resource usage
        avg_cpu_cores = sum(u.cpu_cores_used or 0 for u in usage_records) / len(usage_records)
        avg_memory_gb = sum(u.memory_gb or 0 for u in usage_records) / len(usage_records)
        
        # Get storage from most recent record
        storage_gb = usage_records[-1].storage_gb or 0

        # Calculate costs
        costs = self.calculate_cost(
            cpu_cores=avg_cpu_cores,
            memory_gb=avg_memory_gb,
            storage_gb=storage_gb,
            duration_hours=hours_back,
            provider=provider,
        )

        # Prepare usage data for charts
        usage_data = [
            {
                "timestamp": u.timestamp.isoformat(),
                "cpu_percent": u.cpu_percent,
                "cpu_cores": u.cpu_cores_used or 0,
                "memory_mb": u.memory_mb,
                "memory_gb": u.memory_gb or 0,
                "storage_gb": u.storage_gb or 0,
            }
            for u in usage_records
        ]

        return {
            "container_id": container_id,
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "hours": hours_back,
            },
            "average_usage": {
                "cpu_cores": round(avg_cpu_cores, 3),
                "memory_gb": round(avg_memory_gb, 3),
                "storage_gb": round(storage_gb, 2),
            },
            "costs": costs,
            "usage_history": usage_data,
        }

    def simulate_scenario_cost(
        self,
        cpu_cores: float,
        memory_gb: float,
        storage_gb: float,
        duration_hours: float,
        provider: PricingProvider = PricingProvider.aws,
    ) -> Dict:
        """
        Simulate costs for a hypothetical scenario
        
        Args:
            cpu_cores: Number of CPU cores
            memory_gb: Memory in GB
            storage_gb: Storage in GB
            duration_hours: Duration in hours
            provider: Cloud provider
        
        Returns:
            Dictionary with cost breakdown for the scenario
        """
        costs = self.calculate_cost(
            cpu_cores=cpu_cores,
            memory_gb=memory_gb,
            storage_gb=storage_gb,
            duration_hours=duration_hours,
            provider=provider,
        )

        # Add resource configuration details
        return {
            "scenario": {
                "cpu_cores": cpu_cores,
                "memory_gb": memory_gb,
                "storage_gb": storage_gb,
                "duration_hours": duration_hours,
            },
            "costs": costs,
            "cost_breakdown": {
                "cpu": {
                    "usage": f"{cpu_cores} cores × {duration_hours} hours",
                    "rate": f"${self._get_rate(provider, 'cpu_per_hour')}/hour per core",
                    "cost": costs["cpu_cost"],
                },
                "memory": {
                    "usage": f"{memory_gb} GB × {duration_hours} hours",
                    "rate": f"${self._get_rate(provider, 'memory_per_gb_hour')}/hour per GB",
                    "cost": costs["memory_cost"],
                },
                "storage": {
                    "usage": f"{storage_gb} GB × {duration_hours/730:.2f} months",
                    "rate": f"${self._get_rate(provider, 'storage_per_gb_month')}/month per GB",
                    "cost": costs["storage_cost"],
                },
            },
        }

    def _get_rate(self, provider: PricingProvider, rate_type: str) -> float:
        """Helper to get pricing rate"""
        pricing = self.get_pricing_model(provider)
        if pricing:
            return float(getattr(pricing, rate_type, 0))
        return DEFAULT_PRICING[provider].get(rate_type, 0)

    async def create_billing_snapshot(
        self,
        container_id: int,
        start_time: datetime,
        end_time: datetime,
        provider: PricingProvider = PricingProvider.aws,
    ) -> BillingSnapshot:
        """Create and save a billing snapshot for a time period"""
        duration_hours = (end_time - start_time).total_seconds() / 3600.0
        
        billing_data = await self.calculate_real_time_billing(
            container_id=container_id,
            hours_back=duration_hours,
            provider=provider,
        )

        snapshot = BillingSnapshot(
            container_id=container_id,
            provider=provider,
            start_time=start_time,
            end_time=end_time,
            cpu_cost=billing_data["costs"]["cpu_cost"],
            memory_cost=billing_data["costs"]["memory_cost"],
            storage_cost=billing_data["costs"]["storage_cost"],
            total_cost=billing_data["costs"]["total_cost"],
            usage_data_json=billing_data,
        )

        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot
