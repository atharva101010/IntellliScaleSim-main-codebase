"""
API routes for Load Testing feature
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
import json
import io
import re
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

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


def _safe_pdf_stem(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", (name or "application").strip())
    cleaned = re.sub(r"-+", "-", cleaned).strip("-")
    return cleaned or "application"


def _sample_metric_rows(metrics: List[LoadTestMetric], max_rows: int = 8) -> List[LoadTestMetric]:
    if not metrics:
        return []
    step = max(1, len(metrics) // max_rows)
    sampled = metrics[::step]
    if sampled[-1] is not metrics[-1]:
        sampled.append(metrics[-1])
    return sampled[:max_rows]


def _build_load_test_pdf(
    test: LoadTest,
    container_name: str,
    metrics: List[LoadTestMetric],
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="IntelliScaleSim Load Test Report",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )
    section_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading3"],
        fontSize=11,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4,
        spaceBefore=7,
    )
    body_style = ParagraphStyle(
        "BodyText",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#111827"),
    )

    story = []
    story.append(Paragraph("IntelliScaleSim Load Test Report", title_style))
    story.append(Paragraph(
        f"{container_name} | Test ID {test.id} | Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        subtitle_style,
    ))
    story.append(Spacer(1, 8))

    # Summary numbers
    sent = test.requests_sent or 0
    completed = test.requests_completed or 0
    failed = test.requests_failed or 0
    duration = test.duration_seconds or 0
    success_rate = (completed / sent * 100) if sent > 0 else 0.0
    failure_rate = (failed / sent * 100) if sent > 0 else 0.0
    throughput = (completed / duration) if duration > 0 else 0.0

    verdict = "Healthy run" if success_rate >= 95 and (test.avg_response_time_ms or 0) <= 2000 else "Needs tuning"
    story.append(Paragraph("Executive Summary", section_style))
    story.append(Paragraph(
        f"Status: <b>{test.status.value.title()}</b> | Verdict: <b>{verdict}</b> | "
        f"Success: <b>{success_rate:.2f}%</b> | Throughput: <b>{throughput:.2f} req/s</b>",
        body_style,
    ))

    kpi_data = [[
        f"Sent\n{sent:,}",
        f"Completed\n{completed:,}",
        f"Failed\n{failed:,}",
        f"Avg Latency\n{(test.avg_response_time_ms or 0):.0f} ms",
        f"Peak CPU\n{(test.peak_cpu_percent or 0):.1f}%",
        f"Peak Mem\n{(test.peak_memory_mb or 0):.1f} MB",
    ]]
    kpi_table = Table(kpi_data, colWidths=[1.0 * inch] * 6, hAlign="LEFT")
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(kpi_table)

    story.append(Paragraph("Run Configuration", section_style))
    summary_data = [
        ["Target URL", test.target_url],
        ["Started", str(test.started_at or "N/A")],
        ["Completed", str(test.completed_at or "N/A")],
        ["Configured Requests", f"{test.total_requests:,}"],
        ["Concurrency", f"{test.concurrency}"],
        ["Duration", f"{test.duration_seconds} seconds"],
    ]
    summary_table = Table(summary_data, colWidths=[1.8 * inch, 4.4 * inch], hAlign="LEFT")
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.7),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(summary_table)

    story.append(Paragraph("Performance Metrics", section_style))
    perf_data = [
        ["Metric", "Value"],
        ["Average Response Time", f"{(test.avg_response_time_ms or 0):.2f} ms"],
        ["Minimum Response Time", f"{(test.min_response_time_ms or 0):.2f} ms"],
        ["Maximum Response Time", f"{(test.max_response_time_ms or 0):.2f} ms"],
        ["Peak CPU", f"{(test.peak_cpu_percent or 0):.2f}%"],
        ["Peak Memory", f"{(test.peak_memory_mb or 0):.2f} MB"],
        ["Failure Rate", f"{failure_rate:.2f}%"],
    ]
    perf_table = Table(perf_data, colWidths=[2.5 * inch, 3.7 * inch], hAlign="LEFT")
    perf_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.7),
        ("ALIGN", (1, 1), (1, -1), "LEFT"),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(perf_table)

    if test.error_message:
        story.append(Paragraph("Execution Notes", section_style))
        story.append(Paragraph(f"Error Message: {test.error_message}", body_style))

    sampled = _sample_metric_rows(metrics)
    if sampled:
        story.append(Paragraph("Metric Timeline (Key Checkpoints)", section_style))
        timeline_rows = [["Time (UTC)", "CPU %", "Memory (MB)", "Completed", "Failed", "Active"]]
        for point in sampled:
            timeline_rows.append([
                point.timestamp.strftime("%H:%M:%S") if point.timestamp else "N/A",
                f"{point.cpu_percent:.2f}",
                f"{point.memory_mb:.2f}",
                f"{point.requests_completed}",
                f"{point.requests_failed}",
                f"{point.active_requests}",
            ])

        timeline_table = Table(
            timeline_rows,
            colWidths=[1.2 * inch, 0.85 * inch, 1.05 * inch, 1.1 * inch, 0.8 * inch, 0.8 * inch],
            hAlign="LEFT",
        )
        timeline_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.2),
            ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(timeline_table)
        story.append(Paragraph(
            f"Showing {len(sampled)} checkpoints from {len(metrics)} collected snapshots.",
            subtitle_style,
        ))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


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


@router.get("/{test_id}/report/pdf")
def download_load_test_report(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a detailed PDF report for a completed load test."""
    query = db.query(LoadTest).filter(LoadTest.id == test_id)
    if _role_value(current_user) != "admin":
        query = query.filter(LoadTest.user_id == current_user.id)

    test = query.first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Load test not found")

    if test.status != LoadTestStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF report is available only after test completion",
        )

    container = db.query(Container).filter(Container.id == test.container_id).first()
    container_name = container.name if container else f"container-{test.container_id}"

    metrics = db.query(LoadTestMetric).filter(
        LoadTestMetric.load_test_id == test.id
    ).order_by(LoadTestMetric.timestamp.asc()).all()

    pdf_bytes = _build_load_test_pdf(test, container_name, metrics)
    file_name = f"{_safe_pdf_stem(container_name)}-test.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


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
