"""
API routes for User Profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database.session import get_db
from app.core.security import get_current_user, get_password_hash, verify_password
from app.models.user import User


router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_verified: bool
    created_at: str
    
    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class ProfilePreferences(BaseModel):
    theme: str = "light"
    notifications_enabled: bool = True
    dashboard_refresh_rate: int = 5


@router.get("/me", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    return ProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat() if current_user.created_at else ""
    )


@router.put("/me", response_model=ProfileResponse)
def update_profile(
    update: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    if update.name is not None:
        current_user.name = update.name
    
    if update.email is not None:
        # Check if email already exists
        existing = db.query(User).filter(
            User.email == update.email.lower(),
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = update.email.lower()
    
    db.commit()
    db.refresh(current_user)
    
    return ProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat() if current_user.created_at else ""
    )


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user's password"""
    # Verify current password
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    
    return {"ok": True, "message": "Password changed successfully"}


@router.get("/preferences", response_model=ProfilePreferences)
def get_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get user preferences (stored client-side, this returns defaults)"""
    return ProfilePreferences()


@router.get("/stats")
def get_profile_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's usage statistics"""
    from app.models.container import Container
    from app.models.loadtest import LoadTest
    from app.models.scaling_policy import ScalingPolicy, ScalingEvent
    
    # Count containers
    total_containers = db.query(Container).filter(
        Container.user_id == current_user.id
    ).count()
    
    running_containers = db.query(Container).filter(
        Container.user_id == current_user.id,
        Container.status == 'running'
    ).count()
    
    # Count load tests
    total_load_tests = db.query(LoadTest).filter(
        LoadTest.user_id == current_user.id
    ).count()
    
    # Count scaling policies
    total_policies = db.query(ScalingPolicy).filter(
        ScalingPolicy.user_id == current_user.id
    ).count()
    
    active_policies = db.query(ScalingPolicy).filter(
        ScalingPolicy.user_id == current_user.id,
        ScalingPolicy.enabled == True
    ).count()
    
    return {
        "total_containers": total_containers,
        "running_containers": running_containers,
        "total_load_tests": total_load_tests,
        "total_scaling_policies": total_policies,
        "active_scaling_policies": active_policies
    }
