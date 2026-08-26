import uuid
from typing import List, Callable, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import StaffUser, UserRole

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> StaffUser:
    """
    Validates JWT token and resolves the authenticated StaffUser.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    user = await db.scalar(
        select(StaffUser).where(StaffUser.id == user_id)
    )
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: StaffUser = Depends(get_current_user),
) -> StaffUser:
    """
    Validates that the authenticated user is currently active.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive staff user account",
        )
    return current_user


async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> Optional[StaffUser]:
    """
    Resolves StaffUser if Authorization Bearer header is present and valid; otherwise returns None.
    """
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = uuid.UUID(user_id_str)
        user = await db.scalar(
            select(StaffUser).where(StaffUser.id == user_id, StaffUser.is_active == True)
        )
        return user
    except Exception:
        return None


def require_roles(*allowed_roles: UserRole) -> Callable:
    """
    Dependency factory enforcing Role-Based Access Control (RBAC).
    """
    async def role_checker(
        current_user: StaffUser = Depends(get_current_active_user),
    ) -> StaffUser:
        if current_user.role not in allowed_roles and current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker


async def get_current_tenant_id(
    current_user: StaffUser = Depends(get_current_active_user),
) -> uuid.UUID:
    """
    Resolves the strict Hospital Tenant UUID from the authenticated staff user.
    """
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff account is not associated with an active hospital tenant.",
        )
    return uuid.UUID(str(current_user.hospital_id)) if isinstance(current_user.hospital_id, str) else current_user.hospital_id
