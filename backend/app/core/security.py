from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.user import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Get JWT settings with fallback support
JWT_SECRET = settings.get_jwt_secret()
JWT_ALGORITHM = settings.get_jwt_algorithm()


def get_password_hash(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any], expires_minutes: Optional[int] = None) -> str:
	to_encode = data.copy()
	expire_minutes = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
	expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
	return encoded_jwt


def decode_token(token: str) -> dict[str, Any]:
	"""Decode and validate JWT token."""
	try:
		payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
		return payload
	except JWTError:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Could not validate credentials",
			headers={"WWW-Authenticate": "Bearer"},
		)


def get_current_user(
	credentials: HTTPAuthorizationCredentials = Depends(security),
	db: Session = Depends(get_db)
) -> User:
	"""Extract and return the current authenticated user from JWT token."""
	token = credentials.credentials
	payload = decode_token(token)
	
	user_id: str = payload.get("sub")
	if user_id is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid authentication credentials",
		)
	
	user = db.query(User).filter(User.id == int(user_id)).first()
	if user is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="User not found",
		)
	
	return user


def require_roles(*roles: UserRole | str):
	"""Dependency factory to enforce role-based access control on routes."""
	allowed = {
		(role.value if isinstance(role, UserRole) else str(role)).strip().lower()
		for role in roles
	}

	def _checker(current_user: User = Depends(get_current_user)) -> User:
		user_role = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)).strip().lower()
		if user_role not in allowed:
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="You do not have permission to perform this action",
			)
		return current_user

	return _checker

