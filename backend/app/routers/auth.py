"""POST /auth/login  – email + password, return JWT (or trigger MFA).
POST /auth/verify-mfa – verify a 6-digit OTP code and return JWT."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import verify_password, create_access_token
from app.config import settings
from app.crud.users import get_user_by_email
from app.database import get_db
from app.schemas import LoginRequest, LoginResponse, MfaVerifyRequest, Token
from app.services.email import send_otp_email

router = APIRouter()


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.mfa_enabled:
        token = create_access_token(sub=str(user.id))
        return LoginResponse(access_token=token)

    otp = _generate_otp()
    user.mfa_code = otp
    user.mfa_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.mfa_code_expire_minutes
    )
    user.mfa_code_attempts = 0
    db.commit()

    background_tasks.add_task(send_otp_email, user.email, otp)

    return LoginResponse(mfa_required=True)


@router.post("/verify-mfa", response_model=LoginResponse)
def verify_mfa(data: MfaVerifyRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if not user or not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this account",
        )

    if not user.mfa_code or not user.mfa_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending MFA code. Please log in again.",
        )

    if user.mfa_expires_at < datetime.now(timezone.utc):
        user.mfa_code = None
        user.mfa_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA code has expired. Please log in again.",
        )

    if user.mfa_code_attempts >= settings.mfa_max_attempts:
        user.mfa_code = None
        user.mfa_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please log in again.",
        )

    if not secrets.compare_digest(user.mfa_code, data.code):
        user.mfa_code_attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect MFA code",
        )

    user.mfa_code = None
    user.mfa_expires_at = None
    user.mfa_code_attempts = 0
    db.commit()

    token = create_access_token(sub=str(user.id))
    return LoginResponse(access_token=token)
