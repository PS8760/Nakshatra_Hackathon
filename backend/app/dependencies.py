"""
dependencies.py — FastAPI dependency injection for authentication and RBAC.

Provides:
  - get_current_user  : validates JWT and returns the active User ORM object
  - require_role(role): factory that raises 403 if the caller lacks the role
"""

from functools import lru_cache
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import decode_access_token

# Points to the login endpoint that issues tokens.
# Matches the router prefix defined in routers/auth.py (/auth/login).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Decode the Bearer JWT, look up the user in the DB, and return them.
    Raises 401 if the token is invalid, expired, or the user is inactive.
    """
    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise _CREDENTIALS_EXCEPTION
    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXCEPTION

    return user


def require_role(required_role: str) -> Callable:
    """
    Dependency factory for Role-Based Access Control.

    Usage::

        @router.get("/admin-only")
        def admin_endpoint(user: User = Depends(require_role("clinician"))):
            ...
    """
    def _check(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to role: {required_role}",
            )
        return current_user

    # Give each generated dependency a unique name so FastAPI can cache them
    # independently when the same role is used in multiple routes.
    _check.__name__ = f"require_role_{required_role}"
    return _check
