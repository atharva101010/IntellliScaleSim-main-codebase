"""
Docker Hub API Routes - Search and browse Docker Hub images
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from app.services.dockerhub_service import dockerhub_service, DockerHubImage, DockerHubTag

router = APIRouter(prefix="/dockerhub", tags=["Docker Hub"])


@router.get("/search", response_model=Dict[str, Any])
async def search_images(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Results per page"),
    official_only: bool = Query(False, description="Only show official images")
):
    """
    Search Docker Hub for images
    """
    result = await dockerhub_service.search_images(
        query=q,
        page=page,
        page_size=page_size,
        is_official=True if official_only else None
    )
    
    return {
        "success": True,
        "total_count": result.total_count,
        "page": result.page,
        "page_size": result.page_size,
        "images": [
            {
                "name": img.name,
                "namespace": img.namespace,
                "full_name": img.full_name,
                "description": img.description,
                "star_count": img.star_count,
                "pull_count": img.pull_count,
                "pull_count_formatted": dockerhub_service.format_pull_count(img.pull_count),
                "is_official": img.is_official,
                "is_automated": img.is_automated,
            }
            for img in result.images
        ]
    }


@router.get("/popular", response_model=Dict[str, Any])
async def get_popular_images(
    category: Optional[str] = Query(None, description="Image category"),
    limit: int = Query(20, ge=1, le=50, description="Number of images to return")
):
    """
    Get popular Docker Hub images, optionally filtered by category
    """
    images = await dockerhub_service.get_popular_images(
        category=category,
        limit=limit
    )
    
    return {
        "success": True,
        "count": len(images),
        "category": category,
        "images": [
            {
                "name": img.name,
                "namespace": img.namespace,
                "full_name": img.full_name,
                "description": img.description,
                "star_count": img.star_count,
                "pull_count": img.pull_count,
                "pull_count_formatted": dockerhub_service.format_pull_count(img.pull_count),
                "is_official": img.is_official,
                "last_updated": img.last_updated,
                "logo_url": img.logo_url,
            }
            for img in images
        ]
    }


@router.get("/categories", response_model=Dict[str, Any])
async def get_categories():
    """
    Get available Docker Hub image categories
    """
    categories = await dockerhub_service.get_categories()
    return {
        "success": True,
        "categories": categories
    }


@router.get("/image/{namespace}/{image_name}", response_model=Dict[str, Any])
async def get_image_details(
    namespace: str,
    image_name: str
):
    """
    Get detailed information about a specific Docker Hub image
    """
    # Handle "library" namespace for official images
    if namespace == "_":
        namespace = "library"
    
    image = await dockerhub_service.get_image_details(namespace, image_name)
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Also fetch tags
    tags = await dockerhub_service.get_image_tags(namespace, image_name, page_size=20)
    
    return {
        "success": True,
        "image": {
            "name": image.name,
            "namespace": image.namespace,
            "full_name": image.full_name,
            "description": image.description,
            "star_count": image.star_count,
            "pull_count": image.pull_count,
            "pull_count_formatted": dockerhub_service.format_pull_count(image.pull_count),
            "is_official": image.is_official,
            "is_automated": image.is_automated,
            "last_updated": image.last_updated,
            "logo_url": image.logo_url,
        },
        "tags": [
            {
                "name": tag.name,
                "full_size": tag.full_size,
                "size_formatted": dockerhub_service.format_size(tag.full_size),
                "last_updated": tag.last_updated,
                "digest": tag.digest,
            }
            for tag in tags
        ]
    }


@router.get("/tags/{namespace}/{image_name}", response_model=Dict[str, Any])
async def get_image_tags(
    namespace: str,
    image_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    Get available tags for a Docker Hub image
    """
    if namespace == "_":
        namespace = "library"
    
    tags = await dockerhub_service.get_image_tags(
        namespace=namespace,
        image_name=image_name,
        page=page,
        page_size=page_size
    )
    
    return {
        "success": True,
        "namespace": namespace,
        "image_name": image_name,
        "tags": [
            {
                "name": tag.name,
                "full_size": tag.full_size,
                "size_formatted": dockerhub_service.format_size(tag.full_size),
                "last_updated": tag.last_updated,
                "digest": tag.digest,
            }
            for tag in tags
        ]
    }


@router.get("/featured", response_model=Dict[str, Any])
async def get_featured_images():
    """
    Get featured/recommended Docker Hub images for quick deployment
    """
    featured = dockerhub_service.FEATURED_IMAGES
    
    return {
        "success": True,
        "featured": [
            {
                "name": img["name"],
                "namespace": img["namespace"],
                "description": img["description"],
                "image_string": img["name"] if img["namespace"] == "library" else f"{img['namespace']}/{img['name']}",
            }
            for img in featured
        ]
    }
