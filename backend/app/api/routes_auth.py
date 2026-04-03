from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RequestEmailVerification,
    ConfirmEmailVerification,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.user import UserOut
from app.models.user import User, UserRole
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.token import UserToken, TokenType
from app.services.tokens import generate_token, hash_token, expiry_in
from app.services.mailer import send_email
from app.core.config import settings
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    requested_role = UserRole(payload.role)

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        role=requested_role,
        is_verified=True,  # Auto-verify users (email system not configured)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create verification token and "send" email
    token = generate_token()
    t = UserToken(
        user_id=user.id,
        token_hash=hash_token(token),
        type=TokenType.verify,
        expires_at=expiry_in(settings.VERIFY_TOKEN_MINUTES),
    )
    db.add(t)
    db.commit()

    # Prefer frontend route so users see a friendly page
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_email(
        to=user.email,
        subject=f"Verify your {settings.APP_NAME} email",
        body=f"Hi {user.name},\n\nClick to verify your email: {link}\nThis link expires in {settings.VERIFY_TOKEN_MINUTES} minutes.",
    )
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Email verification check (users are auto-verified on registration)
    if not bool(user.is_verified):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified. Please check your inbox for a verification link or resend it from the login page.")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "verified": bool(user.is_verified),
    })
    return TokenResponse(access_token=token)


@router.post("/verify/request", status_code=200)
def request_email_verification(payload: RequestEmailVerification, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        # Do not reveal user existence
        return {"ok": True}
    if user.is_verified:
        return {"ok": True}

    token = generate_token()
    record = UserToken(
        user_id=user.id,
        token_hash=hash_token(token),
        type=TokenType.verify,
        expires_at=expiry_in(settings.VERIFY_TOKEN_MINUTES),
    )
    db.add(record)
    db.commit()

    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_email(
        to=user.email,
        subject=f"Verify your {settings.APP_NAME} email",
        body=f"Click to verify your email: {link}",
    )
    return {"ok": True}


@router.post("/verify/confirm", status_code=200)
def confirm_email_verification(payload: ConfirmEmailVerification, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.token)
    now = datetime.now(timezone.utc)
    record = (
        db.query(UserToken)
        .filter(UserToken.token_hash == token_hash, UserToken.type == TokenType.verify, UserToken.used == False)
        .first()
    )
    if not record or record.expires_at < now:
        # If the token was already used but the user is verified, treat as success (idempotent)
        used = (
            db.query(UserToken)
            .filter(UserToken.token_hash == token_hash, UserToken.type == TokenType.verify)
            .first()
        )
        if used:
            user = db.query(User).get(used.user_id)
            if user and bool(user.is_verified):
                return {"ok": True}
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).get(record.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    user.is_verified = True
    record.used = True
    db.commit()
    return {"ok": True}


@router.post("/password/forgot", status_code=200)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        return {"ok": True}

    token = generate_token()
    record = UserToken(
        user_id=user.id,
        token_hash=hash_token(token),
        type=TokenType.reset,
        expires_at=expiry_in(settings.RESET_TOKEN_MINUTES),
    )
    db.add(record)
    db.commit()

    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    send_email(
        to=user.email,
        subject=f"Reset your {settings.APP_NAME} password",
        body=f"Click to reset your password: {link}\nThis link expires in {settings.RESET_TOKEN_MINUTES} minutes.",
    )
    return {"ok": True}


@router.post("/password/reset", status_code=200)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.token)
    now = datetime.now(timezone.utc)
    record = (
        db.query(UserToken)
        .filter(UserToken.token_hash == token_hash, UserToken.type == TokenType.reset, UserToken.used == False)
        .first()
    )
    if not record or record.expires_at < now:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).get(record.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")

    user.password_hash = get_password_hash(payload.new_password)
    record.used = True
    db.commit()
    return {"ok": True}
