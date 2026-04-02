from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.scaling_policy import ScalingPolicy, ScalingEvent
from app.models.container import Container
from app.schemas.scaling import (
    ScalingPolicyCreate,
    ScalingPolicyResponse,
    ScalingPolicyUpdate,
    ScalingEventResponse
)

router = APIRouter(prefix="/autoscaling", tags=["autoscaling"])


@router.post("/policies", response_model=ScalingPolicyResponse, status_code=status.HTTP_201_CREATED)
def create_scaling_policy(
    policy: ScalingPolicyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new auto-scaling policy"""
    # Verify container ownership
    container = db.query(Container).filter(
        Container.id == policy.container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    # Check if policy already exists for this container
    existing = db.query(ScalingPolicy).filter(
        ScalingPolicy.container_id == policy.container_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Policy already exists for this container")
    
    # Create policy
    db_policy = ScalingPolicy(**policy.dict(), user_id=current_user.id)
    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    
    return db_policy


@router.get("/policies", response_model=List[ScalingPolicyResponse])
def list_scaling_policies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all scaling policies for the current user"""
    policies = db.query(ScalingPolicy).filter(
        ScalingPolicy.user_id == current_user.id
    ).all()
    
    return policies


@router.get("/policies/{policy_id}", response_model=ScalingPolicyResponse)
def get_scaling_policy(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific scaling policy"""
    policy = db.query(ScalingPolicy).filter(
        ScalingPolicy.id == policy_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    return policy


@router.put("/policies/{policy_id}", response_model=ScalingPolicyResponse)
def update_scaling_policy(
    policy_id: int,
    policy_update: ScalingPolicyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a scaling policy"""
    policy = db.query(ScalingPolicy).filter(
        ScalingPolicy.id == policy_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Update fields
    for key, value in policy_update.dict(exclude_unset=True).items():
        setattr(policy, key, value)
    
    db.commit()
    db.refresh(policy)
    
    return policy


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scaling_policy(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a scaling policy"""
    policy = db.query(ScalingPolicy).filter(
        ScalingPolicy.id == policy_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    db.delete(policy)
    db.commit()
    
    return None


@router.post("/policies/{policy_id}/toggle", response_model=ScalingPolicyResponse)
def toggle_scaling_policy(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle a scaling policy enabled/disabled"""
    policy = db.query(ScalingPolicy).filter(
        ScalingPolicy.id == policy_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    policy.enabled = not policy.enabled
    db.commit()
    db.refresh(policy)
    
    return policy


@router.get("/events", response_model=List[ScalingEventResponse])
def list_scaling_events(
    container_id: int = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List recent scaling events"""
    query = db.query(ScalingEvent).join(
        ScalingPolicy,
        ScalingEvent.policy_id == ScalingPolicy.id
    ).filter(
        ScalingPolicy.user_id == current_user.id
    )
    
    if container_id:
        query = query.filter(ScalingEvent.container_id == container_id)
    
    events = query.order_by(ScalingEvent.created_at.desc()).limit(limit).all()
    
    return events


@router.post("/evaluate-now")
async def evaluate_policies_now(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """MANUAL TRIGGER - Immediately evaluate all policies for testing"""
    from app.services.autoscaler_service import AutoScalerService
    from app.services.docker_service import DockerService
    import logging
    
    logger = logging.getLogger(__name__)
    logger.info("🔥 MANUAL EVALUATION TRIGGERED by user")
    
    try:
        docker_service = DockerService()
        autoscaler = AutoScalerService(db, docker_service)
        
        logger.info("Evaluating all policies...")
        await autoscaler.evaluate_all_policies()
        
        logger.info("✅ Evaluation complete")
        
        return {
            "status": "success",
            "message": "Policy evaluation completed. Check scaling events."
        }
    except Exception as e:
        logger.error(f"Error during manual evaluation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
