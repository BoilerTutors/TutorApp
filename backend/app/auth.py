from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Admin, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(sub: str, role: str = "user") -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {"sub": sub, "role": role, "exp": expire}
    return jwt.encode(
        to_encode,
        settings.secret_key.get_secret_value(),
        algorithm=settings.algorithm,
    )


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[settings.algorithm],
        )
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def get_user_from_token(token: str, db: Session) -> User:
    payload = decode_token(token)
    role = payload.get("role", "user")
    if role != "user":
        raise HTTPException(status_code=401, detail="Invalid token")
    sub = payload["sub"]
    try:
        user_id = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_admin_from_token(token: str, db: Session) -> Admin:
    payload = decode_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Invalid token")
    sub = payload["sub"]
    try:
        admin_id = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    admin = db.get(Admin, admin_id)
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin


def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_user_from_token(credentials.credentials, db)


def get_current_user_optional(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Optional[User]:
    if not credentials:
        return None
    return get_user_from_token(credentials.credentials, db)


def get_current_admin(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Admin:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_admin_from_token(credentials.credentials, db)
