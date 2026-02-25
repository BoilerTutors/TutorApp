"""POST /auth/login - login with email + password, return JWT."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import verify_password, create_access_token
from app.crud.users import get_user_by_email
from app.database import get_db
from app.schemas import LoginRequest, Token

router = APIRouter()


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token(sub=str(user.id))
    return Token(access_token=token, token_type="bearer")
