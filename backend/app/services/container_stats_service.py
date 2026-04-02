"""
Container Stats Service
Collects real-time metrics from Docker containers.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.services.docker_service import get_docker_service

logger = logging.getLogger(__name__)


class ContainerStatsService:
    """Service for collecting container statistics."""

    def __init__(self):
        self.docker_service = get_docker_service()
        logger.info("Container stats service initialized (DockerService backend)")

    async def get_container_stats(self, container_id: str) -> Optional[Dict]:
        """Get real-time stats for a specific container."""
        try:
            stats = await self.docker_service.get_container_stats_async(container_id)
            if not stats:
                return None

            network_rx_bytes = int(stats.get("network_rx_bytes", 0) or 0)
            network_tx_bytes = int(stats.get("network_tx_bytes", 0) or 0)

            network_rx_mb = stats.get("network_rx_mb")
            if network_rx_mb is None:
                network_rx_mb = network_rx_bytes / (1024.0 * 1024.0)

            network_tx_mb = stats.get("network_tx_mb")
            if network_tx_mb is None:
                network_tx_mb = network_tx_bytes / (1024.0 * 1024.0)

            return {
                "cpu_percent": float(stats.get("cpu_percent", 0.0) or 0.0),
                "memory_usage_mb": float(stats.get("memory_usage_mb", 0.0) or 0.0),
                "memory_limit_mb": float(stats.get("memory_limit_mb", 0.0) or 0.0),
                "memory_percent": float(stats.get("memory_percent", 0.0) or 0.0),
                "network_rx_bytes": network_rx_bytes,
                "network_tx_bytes": network_tx_bytes,
                "network_rx_mb": round(float(network_rx_mb), 2),
                "network_tx_mb": round(float(network_tx_mb), 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error getting stats for {container_id}: {e}")
            return None

    def get_all_containers_stats(self) -> List[Dict]:
        """Get stats for all running containers (compat placeholder)."""
        return []


# Singleton instance
container_stats_service = ContainerStatsService()
