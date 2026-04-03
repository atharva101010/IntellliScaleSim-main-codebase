"""
API routes for Load Testing feature
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
import json
from datetime import datetime, timezone

from app.database.session import get_db
from app.core.security import get_current_user, decode_token
from app.models.user import User
from app.models.container import Container
from app.models.loadtest import LoadTest, LoadTestMetric, LoadTestStatus
from app.schemas.loadtest import (
    LoadTestCreate,
    LoadTestResponse,
    LoadTestStartResponse,
    LoadTestHistoryResponse,
    LoadTestListItem,
    LoadTestCancelResponse,
    LoadTestStreamMetric,
    LoadTestProfileResponse,
)
from app.services.loadtest_service import LoadTestService
from app.services.docker_service import DockerService

router = APIRouter(prefix="/loadtest", tags=["loadtest"])


LOAD_TEST_PROFILES = {
    "easy": {"label": "Easy", "total_requests": 500, "concurrency": 10, "duration_seconds": 30},
    "medium": {"label": "Medium", "total_requests": 5000, "concurrency": 100, "duration_seconds": 60},
    "heavy": {"label": "Heavy", "total_requests": 25000, "concurrency": 300, "duration_seconds": 120},
}


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _can_access_container_for_test(current_user: User, container: Container, db: Session) -> bool:
    role = _role_value(current_user)

    if role == "admin":
        return True

    if container.user_id == current_user.id:
        return True

    if role == "student":
        return False

    owner = db.query(User.id, User.role).filter(User.id == container.user_id).first()
    if not owner:
        return False

    owner_role = owner.role.value if hasattr(owner.role, "value") else str(owner.role)
    return owner_role == "student"


def get_load_test_service(db: Session = Depends(get_db)) -> LoadTestService:
    """Dependency to get load test service - creates new instance per request"""
    docker_service = DockerService()
    return LoadTestService(db, docker_service)


@router.get("/profiles", response_model=List[LoadTestProfileResponse])
def list_load_test_profiles(
    _current_user: User = Depends(get_current_user),
):
    """Return supported load-test presets for UI and API clients."""
    return [
        LoadTestProfileResponse(name=name, label=data["label"], **{k: v for k, v in data.items() if k != "label"})
        for name, data in LOAD_TEST_PROFILES.items()
    ]



@router.post("/start", response_model=LoadTestStartResponse, status_code=status.HTTP_201_CREATED)
async def start_load_test(
    request: LoadTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: LoadTestService = Depends(get_load_test_service)
):
    """
    Start a new load test
    
    Validates container ownership, ensures container is running,
    and queues the test for execution in the background
    """
    try:
        # Optional profile overrides manual values when provided.
        if request.profile:
            profile_name = request.profile.strip().lower()
            preset = LOAD_TEST_PROFILES.get(profile_name)
            if not preset:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid load-test profile '{request.profile}'. Use one of: easy, medium, heavy",
                )

            request.total_requests = preset["total_requests"]
            request.concurrency = preset["concurrency"]
            request.duration_seconds = preset["duration_seconds"]

        # 1. Verify container exists and role is allowed to test it
        container = db.query(Container).filter(Container.id == request.container_id).first()
        
        if not container or not _can_access_container_for_test(current_user, container, db):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Container not found"
            )
        
        # 2. Verify container is running
        container_status = container.status.value if hasattr(container.status, 'value') else str(container.status)
        if container_status != "running":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Can only test running containers (current status: {container_status})"
            )
        
        # 3. Determine target URL
        target_url = request.target_url
        if not target_url:
            # Use container's localhost URL
            if container.localhost_url:
                target_url = container.localhost_url
            elif container.port:
                target_url = f"http://localhost:{container.port}"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Container has no accessible URL"
                )
        
        # 4. Create load test record
        load_test = LoadTest(
            user_id=current_user.id,
            container_id=container.id,
            target_url=target_url,
            total_requests=request.total_requests,
            concurrency=request.concurrency,
            duration_seconds=request.duration_seconds,
            status=LoadTestStatus.PENDING
        )
        db.add(load_test)
        db.commit()
        db.refresh(load_test)
        
        # 5. Start test in background and register for cancellation across requests
        task = asyncio.create_task(service.execute_load_test(load_test.id))
        service.register_test_task(load_test.id, task)
        
        return LoadTestStartResponse(
            id=load_test.id,
            status="pending",
            message="Load test queued"
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any other exception and return details as JSON
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {type(e).__name__}: {str(e)} | Traceback: {traceback.format_exc()[:500]}"
        )


@router.get("/{test_id}", response_model=LoadTestResponse)
def get_load_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: LoadTestService = Depends(get_load_test_service)
):
    """Get load test status and results"""
    # Query test
    query = db.query(LoadTest).filter(LoadTest.id == test_id)
    if _role_value(current_user) != "admin":
        query = query.filter(LoadTest.user_id == current_user.id)

    test = query.first()
    
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load test not found"
        )
    
    # Calculate progress
    progress = service.get_progress(test)
    
    # Convert to response
    response = LoadTestResponse.from_orm(test)
    response.progress_percent = progress
    
    return response


@router.get("/{test_id}/metrics/stream")
async def stream_load_test_metrics(
    test_id: int,
    request: Request,
    token: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Stream real-time metrics using Server-Sent Events (SSE)
    """
    # Resolve user from either Authorization header (preferred) or token query (EventSource fallback)
    resolved_user_id: Optional[int] = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        bearer_token = auth_header.split(" ", 1)[1]
        payload = decode_token(bearer_token)
        resolved_user_id = int(payload.get("sub")) if payload.get("sub") else None
    elif token:
        payload = decode_token(token)
        resolved_user_id = int(payload.get("sub")) if payload.get("sub") else None

    if not resolved_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    requester = db.query(User).filter(User.id == resolved_user_id).first()
    if not requester:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Verify test visibility for requester
    query = db.query(LoadTest).filter(LoadTest.id == test_id)
    if _role_value(requester) != "admin":
        query = query.filter(LoadTest.user_id == resolved_user_id)

    test = query.first()
    
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load test not found"
        )
    
    async def event_generator():
        """Generate SSE events with metrics"""
        try:
            while True:
                # Refresh test status
                db.refresh(test)
                
                # If test is complete, send final event and stop
                if test.status in [LoadTestStatus.COMPLETED, LoadTestStatus.FAILED, LoadTestStatus.CANCELLED]:
                    yield f"event: complete\ndata: {json.dumps({'status': test.status.value, 'total_completed': test.requests_completed, 'total_failed': test.requests_failed})}\n\n"
                    break
                
                # Get latest metric
                latest_metric = db.query(LoadTestMetric).filter(
                    LoadTestMetric.load_test_id == test_id
                ).order_by(LoadTestMetric.timestamp.desc()).first()
                
                if latest_metric:
                    # Calculate progress
                    progress = (test.requests_sent / test.total_requests * 100) if test.total_requests > 0 else 0
                    
                    # Create metric data
                    metric_data = LoadTestStreamMetric(
                        timestamp=latest_metric.timestamp.isoformat(),
                        cpu=latest_metric.cpu_percent,
                        memory=latest_metric.memory_mb,
                        completed=latest_metric.requests_completed,
                        failed=latest_metric.requests_failed,
                        progress=progress,
                        active=latest_metric.active_requests
                    )
                    
                    # Send SSE event
                    yield f"event: metric\ndata: {metric_data.json()}\n\n"
                
                # Wait before next update
                await asyncio.sleep(2)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/history", response_model=LoadTestHistoryResponse)
def get_load_test_history(
    container_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get load test history for user"""
    # Build query
    query = db.query(LoadTest)
    if _role_value(current_user) != "admin":
        query = query.filter(LoadTest.user_id == current_user.id)
    
    if container_id:
        query = query.filter(LoadTest.container_id == container_id)
    
    # Get tests
    tests = query.order_by(LoadTest.created_at.desc()).limit(limit).all()
    total = query.count()
    
    # Convert to list items with container names
    items = []
    for test in tests:
        container = db.query(Container).filter(Container.id == test.container_id).first()
        item = LoadTestListItem.from_orm(test)
        item.container_name = container.name if container else None
        items.append(item)
    
    return LoadTestHistoryResponse(tests=items, total=total)


@router.delete("/{test_id}", response_model=LoadTestCancelResponse)
async def cancel_load_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: LoadTestService = Depends(get_load_test_service)
):
    """Cancel a running load test"""
    # Verify test exists and belongs to user
    query = db.query(LoadTest).filter(LoadTest.id == test_id)
    if _role_value(current_user) != "admin":
        query = query.filter(LoadTest.user_id == current_user.id)

    test = query.first()
    
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load test not found"
        )
    
    # Only cancel if running
    if test.status != LoadTestStatus.RUNNING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel test in {test.status.value} status"
        )

    task = service.get_test_task(test_id)
    if not task:
        # Fallback for orphaned/background task state after restarts.
        test.status = LoadTestStatus.CANCELLED
        test.completed_at = datetime.now(timezone.utc)
        db.commit()
        return LoadTestCancelResponse(message="Load test cancelled")
    
    # Cancel the test
    await service.cancel_load_test(test_id)
    
    return LoadTestCancelResponse(message="Load test cancelled")
