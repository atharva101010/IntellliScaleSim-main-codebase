from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.api import (
    routes_auth, 
    routes_containers, 
    routes_loadtest, 
    routes_dashboard, 
    routes_monitoring, 
    routes_autoscaling, 
    routes_billing,
    routes_dockerhub,
    routes_profile,
    routes_admin,
    routes_classes,
    routes_tasks,
)
from app.models.base import Base
from app.models.user import User, UserRole
from app.database.session import engine
from app.database.init_db import ensure_columns
from app import models
from app.core.config import settings
from app.core.security import get_password_hash
import logging
import asyncio
import time
import os
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'intelliscale_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'intelliscale_http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)
ACTIVE_REQUESTS = Gauge(
    'intelliscale_http_requests_active',
    'Number of active HTTP requests'
)
CONTAINER_COUNT = Gauge(
    'intelliscale_containers_total',
    'Total number of containers',
    ['status']
)

# FastAPI app with metadata
app = FastAPI(
    title="IntelliScaleSim API",
    description="Cloud container simulation platform with AI-powered cost estimation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS - comprehensive for development and production
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3500",  # Grafana
    "http://127.0.0.1:3500",
    "http://frontend:80",
    "http://frontend:5173",
]

# Add CORS origins from environment
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https?://.*\.app\.github\.dev$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Metrics middleware
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Track request metrics for Prometheus"""
    ACTIVE_REQUESTS.inc()
    start_time = time.time()
    
    try:
        response = await call_next(request)
        
        # Record metrics
        duration = time.time() - start_time
        endpoint = request.url.path
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code
        ).inc()
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=endpoint
        ).observe(duration)
        
        return response
    finally:
        ACTIVE_REQUESTS.dec()


@app.get("/")
def root():
    """Root endpoint - API health check"""
    return {
        "name": "IntelliScaleSim API",
        "version": "1.0.0",
        "status": "ok",
        "features": [
            "container_deployment",
            "docker_hub_integration",
            "prometheus_monitoring",
            "autoscaling",
            "billing_simulation"
        ]
    }


@app.get("/healthz")
def healthz():
    """Health check endpoint for container orchestration"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "api": "ok",
            "database": "ok"
        }
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# Include all routers
app.include_router(routes_auth.router)
app.include_router(routes_containers.router)
app.include_router(routes_loadtest.router)
app.include_router(routes_dashboard.router)
app.include_router(routes_monitoring.router)
app.include_router(routes_autoscaling.router)
app.include_router(routes_billing.router)
app.include_router(routes_dockerhub.router)  # Docker Hub API
app.include_router(routes_profile.router)    # User Profile API
app.include_router(routes_admin.router)      # Admin-only system and user management APIs
app.include_router(routes_classes.router)    # Teacher/admin classroom APIs
app.include_router(routes_tasks.router)      # Student/teacher task management APIs

logger = logging.getLogger(__name__)


# Background task for auto-scaling
async def autoscaler_background_task():
    """Background task that evaluates scaling policies every 30 seconds"""
    from app.services.autoscaler_service import AutoScalerService
    from app.services.docker_service import DockerService
    from app.database.session import SessionLocal
    
    logger.info("🚀 Auto-scaler background task started")
    
    while True:
        try:
            await asyncio.sleep(10)  # Every 10 seconds (increased from 30s)
            
            # Create new session for this iteration
            db = SessionLocal()
            try:
                docker_service = DockerService()
                autoscaler = AutoScalerService(db, docker_service)
                
                logger.info("🔍 Evaluating auto-scaling policies...")
                await autoscaler.evaluate_all_policies()
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"❌ Error in autoscaler background task: {e}", exc_info=True)


async def billing_metrics_background_task():
    """Background task that collects billing metrics every minute"""
    from app.services.billing_service import BillingService
    from app.services.prometheus_metrics_service import prometheus_metrics_service
    from app.database.session import SessionLocal
    from app.models.container import Container, ContainerStatus
    from app.models.scaling_policy import ScalingPolicy
    
    logger.info("💰 Billing metrics collection task started")
    
    while True:
        try:
            await asyncio.sleep(60)  # Every 1 minute
            
            db = SessionLocal()
            try:
                billing_service = BillingService(db)
                
                # Get all running containers
                containers = db.query(Container).filter(Container.status == ContainerStatus.running).all()
                
                count = 0
                stale_count = 0
                for container in containers:
                    if container.container_id:
                        if not billing_service.docker_service.container_exists(container.container_id):
                            logger.warning(
                                f"Detected stale runtime container reference for DB container {container.id}. Marking as stopped and disabling active policies."
                            )
                            container.status = ContainerStatus.stopped
                            container.stopped_at = datetime.now(timezone.utc)
                            container.container_id = None
                            db.query(ScalingPolicy).filter(
                                ScalingPolicy.container_id == container.id,
                                ScalingPolicy.enabled == True,
                            ).update(
                                {
                                    ScalingPolicy.enabled: False,
                                    ScalingPolicy.updated_at: datetime.now(timezone.utc),
                                },
                                synchronize_session=False,
                            )
                            db.commit()
                            stale_count += 1
                            continue

                        try:
                            metrics = await billing_service.collect_container_metrics(container)
                            if metrics:
                                billing_service.save_resource_usage(container.id, metrics)
                                
                                # Update Prometheus metrics too
                                await prometheus_metrics_service.update_container_metrics(
                                    container_id=container.container_id,
                                    container_name=container.name,
                                    user_id=container.user_id
                                )
                                count += 1
                        except Exception as e:
                            logger.error(f"Error collecting background metrics for {container.id}: {e}")
                
                if count > 0:
                    logger.info(f"📊 Collected billing metrics for {count} containers")
                if stale_count > 0:
                    logger.info(f"🧹 Cleaned {stale_count} stale container references")
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"❌ Error in billing metrics background task: {e}")


@app.on_event("startup")
async def on_startup():
    logger.info("🚀 STARTUP: Application is starting up")
    # Create tables
    Base.metadata.create_all(bind=engine)
    ensure_columns(engine)

    # Keep local/demo environments aligned with documented default credentials.
    if settings.SEED_DEMO_USER and settings.APP_ENV.lower() != "production":
        try:
            from app.database.session import SessionLocal

            db = SessionLocal()
            demo_email = settings.DEMO_USER_EMAIL.lower().strip()
            demo_user = db.query(User).filter(User.email == demo_email).first()

            role_value = settings.DEMO_USER_ROLE.strip().lower()
            try:
                demo_role = UserRole(role_value)
            except ValueError:
                logger.warning(
                    "Invalid DEMO_USER_ROLE '%s', defaulting to 'admin'",
                    settings.DEMO_USER_ROLE,
                )
                demo_role = UserRole.admin

            if demo_user is None:
                demo_user = User(
                    name=settings.DEMO_USER_NAME,
                    email=demo_email,
                    password_hash=get_password_hash(settings.DEMO_USER_PASSWORD),
                    role=demo_role,
                    is_verified=True,
                )
                db.add(demo_user)
                db.commit()
                logger.info("✅ Seeded demo user %s", demo_email)
            elif settings.DEMO_USER_OVERWRITE:
                demo_user.name = settings.DEMO_USER_NAME
                demo_user.password_hash = get_password_hash(settings.DEMO_USER_PASSWORD)
                demo_user.role = demo_role
                demo_user.is_verified = True
                db.commit()
                logger.info("✅ Refreshed demo user credentials for %s", demo_email)

            db.close()
        except Exception as e:
            logger.error(f"⚠️ Error while seeding demo user: {e}")
    
    
    # Initialize billing pricing models
    try:
        from app.services.billing_service import BillingService
        from app.database.session import SessionLocal
        
        db = SessionLocal()

        # Seed billing pricing models
        billing_service = BillingService(db)
        billing_service.initialize_pricing_models()
        logger.info("💰 Billing pricing models initialized")
        
        db.close()
    except Exception as e:
        logger.error(f"⚠️ Error during database initialization: {e}")

    logger.info("========================================")
    logger.info("📊 Starting background tasks...")
    logger.info("========================================")
    
    # Start background tasks
    loop = asyncio.get_event_loop()
    loop.create_task(autoscaler_background_task())
    loop.create_task(billing_metrics_background_task())
    logger.info("✅ Background tasks scheduled")
    
    logger.info("✅ Application startup complete")
