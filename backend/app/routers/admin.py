from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_admin
from app.crud.admin import authenticate_admin, create_admin, get_admin_by_email
from app.database import get_db
from app.models import Admin
from app.schemas import AdminCreate, AdminPublic, LoginRequest, Message, Token

router = APIRouter()


@router.post("/", response_model=AdminPublic, status_code=status.HTTP_201_CREATED)
def register_admin(data: AdminCreate, db: Session = Depends(get_db)) -> AdminPublic:
    if get_admin_by_email(db, str(data.email)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    admin = create_admin(db, data)
    return AdminPublic.model_validate(admin)


@router.post("/login", response_model=Token)
def login_admin(data: LoginRequest, db: Session = Depends(get_db)) -> Token:
    admin = authenticate_admin(db, str(data.email), data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(sub=str(admin.id), role="admin")
    return Token(access_token=token)


@router.post("/logout", response_model=Message)
def logout_admin(current_admin: Admin = Depends(get_current_admin)) -> Message:
    return Message(message=f"Admin {current_admin.id} logged out successfully")


@router.get("/me", response_model=AdminPublic)
def get_admin_me(current_admin: Admin = Depends(get_current_admin)) -> AdminPublic:
    return AdminPublic.model_validate(current_admin)
