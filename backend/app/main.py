from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes_auth, routes_containers, routes_loadtest, routes_dashboard, routes_monitoring, routes_autoscaling, routes_billing
from app.models.base import Base
from app.database.session import engine
from app.database.init_db import ensure_columns
from app import models
import logging
import asyncio
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = logging.getLogger(__name__)

# Load Testing feature enabled
app = FastAPI(title="IntelliScaleSim API", version="0.1.0")

# Configure CORS - allow all origins for development
# In production, restrict this to your specific domains
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for GitHub Codespaces
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"name": "IntelliScaleSim API", "status": "ok"}


@app.get("/healthz")
def healthz():
    return {"status": "healthy"}

# Include routers
app.include_router(routes_auth.router)
app.include_router(routes_containers.router)
app.include_router(routes_loadtest.router)
app.include_router(routes_dashboard.router)
app.include_router(routes_monitoring.router)
app.include_router(routes_autoscaling.router)  # Auto-scaling API
app.include_router(routes_billing.router)  # Billing & Resource Quotas API

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
    from app.models.container import Container
    
    logger.info("💰 Billing metrics collection task started")
    
    while True:
        try:
            await asyncio.sleep(60)  # Every 1 minute
            
            db = SessionLocal()
            try:
                billing_service = BillingService(db)
                
                # Get all running containers
                containers = db.query(Container).filter(Container.status == 'running').all()
                
                count = 0
                for container in containers:
                    if container.container_id:
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
    
    
    # Initialize default demo user and billing models
    try:
        from app.core.security import get_password_hash
        from app.models.user import User, UserRole
        from app.services.billing_service import BillingService
        from app.database.session import SessionLocal
        
        db = SessionLocal()
        
        # 1. Seed demo user
        demo_email = "demo@test.com"
        demo_user = db.query(User).filter(User.email == demo_email).first()
        if not demo_user:
            logger.info(f"👤 Creating default demo user: {demo_email}")
            new_user = User(
                name="Demo User",
                email=demo_email,
                password_hash=get_password_hash("Password123!"),
                role=UserRole.admin,
                is_verified=True
            )
            db.add(new_user)
            db.commit()
            logger.info("✅ Default demo user created successfully")
            
        # 2. Seed billing pricing models
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
