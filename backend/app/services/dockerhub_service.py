"""
Docker Hub API Service - Fetch popular images and search Docker Hub
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import httpx
from pydantic import BaseModel
from cachetools import TTLCache

logger = logging.getLogger(__name__)

# Cache for Docker Hub API responses (TTL: 5 minutes)
_hub_cache = TTLCache(maxsize=100, ttl=300)

DOCKER_HUB_API_URL = "https://hub.docker.com/v2"


class DockerHubImage(BaseModel):
    """Docker Hub image information"""
    name: str
    namespace: str
    full_name: str
    description: str
    star_count: int
    pull_count: int
    is_official: bool
    is_automated: bool
    last_updated: Optional[str] = None
    logo_url: Optional[str] = None
    categories: List[str] = []


class DockerHubTag(BaseModel):
    """Docker image tag information"""
    name: str
    full_size: int
    last_updated: str
    digest: Optional[str] = None
    images: List[Dict[str, Any]] = []


class DockerHubSearchResult(BaseModel):
    """Search results from Docker Hub"""
    total_count: int
    page: int
    page_size: int
    images: List[DockerHubImage]


class DockerHubService:
    """Service for interacting with Docker Hub API"""
    
    # Popular categories of images
    POPULAR_CATEGORIES = {
        "web_servers": ["nginx", "httpd", "traefik", "caddy"],
        "databases": ["postgres", "mysql", "mongo", "redis", "mariadb", "elasticsearch"],
        "programming": ["python", "node", "golang", "openjdk", "php", "ruby"],
        "message_queues": ["rabbitmq", "kafka", "nats"],
        "monitoring": ["prometheus", "grafana", "influxdb"],
        "devops": ["jenkins", "gitlab", "drone", "sonarqube"],
        "containers": ["docker", "registry", "portainer"],
        "utilities": ["alpine", "busybox", "ubuntu", "debian"],
    }
    
    # Featured images for quick access
    FEATURED_IMAGES = [
        {"name": "nginx", "namespace": "library", "description": "High performance web server and reverse proxy"},
        {"name": "postgres", "namespace": "library", "description": "Powerful, open source relational database"},
        {"name": "redis", "namespace": "library", "description": "In-memory data structure store"},
        {"name": "mongo", "namespace": "library", "description": "Document-oriented NoSQL database"},
        {"name": "node", "namespace": "library", "description": "JavaScript runtime built on Chrome's V8 engine"},
        {"name": "python", "namespace": "library", "description": "Interpreted, high-level programming language"},
        {"name": "mysql", "namespace": "library", "description": "World's most popular open source database"},
        {"name": "rabbitmq", "namespace": "library", "description": "Open source message broker"},
        {"name": "elasticsearch", "namespace": "library", "description": "Distributed search and analytics engine"},
        {"name": "grafana/grafana", "namespace": "grafana", "description": "Open observability platform"},
        {"name": "prom/prometheus", "namespace": "prom", "description": "Monitoring system and time series database"},
        {"name": "jenkins/jenkins", "namespace": "jenkins", "description": "Open source automation server"},
    ]
    
    def __init__(self):
        self.base_url = DOCKER_HUB_API_URL
    
    async def search_images(
        self,
        query: str,
        page: int = 1,
        page_size: int = 25,
        is_official: Optional[bool] = None
    ) -> DockerHubSearchResult:
        """
        Search Docker Hub for images
        """
        cache_key = f"search:{query}:{page}:{page_size}:{is_official}"
        if cache_key in _hub_cache:
            return _hub_cache[cache_key]
        
        params = {
            "query": query,
            "page": page,
            "page_size": min(page_size, 100),
        }
        if is_official is not None:
            params["is_official"] = "true" if is_official else "false"
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/search/repositories",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                images = []
                for item in data.get("results", []):
                    images.append(DockerHubImage(
                        name=item.get("repo_name", "").split("/")[-1],
                        namespace=item.get("repo_name", "").split("/")[0] if "/" in item.get("repo_name", "") else "library",
                        full_name=item.get("repo_name", ""),
                        description=item.get("short_description", "") or "",
                        star_count=item.get("star_count", 0),
                        pull_count=item.get("pull_count", 0),
                        is_official=item.get("is_official", False),
                        is_automated=item.get("is_automated", False),
                    ))
                
                result = DockerHubSearchResult(
                    total_count=data.get("count", 0),
                    page=page,
                    page_size=page_size,
                    images=images
                )
                
                _hub_cache[cache_key] = result
                return result
                
        except httpx.HTTPError as e:
            logger.error(f"Docker Hub API error: {e}")
            return DockerHubSearchResult(
                total_count=0,
                page=page,
                page_size=page_size,
                images=[]
            )
    
    async def get_image_details(self, namespace: str, image_name: str) -> Optional[DockerHubImage]:
        """
        Get detailed information about a specific image
        """
        cache_key = f"image:{namespace}/{image_name}"
        if cache_key in _hub_cache:
            return _hub_cache[cache_key]
        
        # Handle official images (library namespace)
        if namespace == "library":
            url = f"{self.base_url}/repositories/library/{image_name}"
        else:
            url = f"{self.base_url}/repositories/{namespace}/{image_name}"
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                image = DockerHubImage(
                    name=data.get("name", image_name),
                    namespace=data.get("namespace", namespace),
                    full_name=f"{namespace}/{image_name}" if namespace != "library" else image_name,
                    description=data.get("description", "") or data.get("short_description", "") or "",
                    star_count=data.get("star_count", 0),
                    pull_count=data.get("pull_count", 0),
                    is_official=namespace == "library",
                    is_automated=data.get("is_automated", False),
                    last_updated=data.get("last_updated"),
                    logo_url=data.get("logo_url"),
                )
                
                _hub_cache[cache_key] = image
                return image
                
        except httpx.HTTPError as e:
            logger.warning(f"Could not fetch image details for {namespace}/{image_name}: {e}")
            return None
    
    async def get_image_tags(
        self,
        namespace: str,
        image_name: str,
        page: int = 1,
        page_size: int = 10
    ) -> List[DockerHubTag]:
        """
        Get available tags for an image
        """
        cache_key = f"tags:{namespace}/{image_name}:{page}"
        if cache_key in _hub_cache:
            return _hub_cache[cache_key]
        
        if namespace == "library":
            url = f"{self.base_url}/repositories/library/{image_name}/tags"
        else:
            url = f"{self.base_url}/repositories/{namespace}/{image_name}/tags"
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    url,
                    params={"page": page, "page_size": page_size}
                )
                response.raise_for_status()
                data = response.json()
                
                tags = []
                for item in data.get("results", []):
                    tags.append(DockerHubTag(
                        name=item.get("name", ""),
                        full_size=item.get("full_size", 0),
                        last_updated=item.get("last_updated", ""),
                        digest=item.get("digest"),
                        images=item.get("images", [])
                    ))
                
                _hub_cache[cache_key] = tags
                return tags
                
        except httpx.HTTPError as e:
            logger.warning(f"Could not fetch tags for {namespace}/{image_name}: {e}")
            return []
    
    async def get_popular_images(
        self,
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[DockerHubImage]:
        """
        Get popular images, optionally filtered by category
        """
        cache_key = f"popular:{category}:{limit}"
        if cache_key in _hub_cache:
            return _hub_cache[cache_key]
        
        images = []
        
        if category and category in self.POPULAR_CATEGORIES:
            # Get images from specific category
            image_names = self.POPULAR_CATEGORIES[category]
            for name in image_names[:limit]:
                details = await self.get_image_details("library", name)
                if details:
                    images.append(details)
        else:
            # Get featured images
            for item in self.FEATURED_IMAGES[:limit]:
                name = item["name"]
                namespace = item.get("namespace", "library")
                
                # Check if it's a namespaced image
                if "/" in name:
                    parts = name.split("/")
                    namespace = parts[0]
                    name = parts[1]
                
                details = await self.get_image_details(namespace, name)
                if details:
                    images.append(details)
                else:
                    # Use fallback data
                    images.append(DockerHubImage(
                        name=name,
                        namespace=namespace,
                        full_name=item["name"],
                        description=item["description"],
                        star_count=0,
                        pull_count=0,
                        is_official=namespace == "library",
                        is_automated=False
                    ))
        
        _hub_cache[cache_key] = images
        return images
    
    async def get_categories(self) -> Dict[str, List[str]]:
        """Get available image categories"""
        return self.POPULAR_CATEGORIES
    
    def format_pull_count(self, count: int) -> str:
        """Format pull count for display (e.g., 1.2M, 500K)"""
        if count >= 1_000_000_000:
            return f"{count / 1_000_000_000:.1f}B"
        elif count >= 1_000_000:
            return f"{count / 1_000_000:.1f}M"
        elif count >= 1_000:
            return f"{count / 1_000:.1f}K"
        else:
            return str(count)
    
    def format_size(self, size_bytes: int) -> str:
        """Format size in bytes to human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"


# Singleton instance
dockerhub_service = DockerHubService()
