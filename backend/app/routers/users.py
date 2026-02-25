"""API routes for User accounts.

- POST   /users/          - register a new user
- GET    /users/me        - get current authenticated user
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_user
from app.crud.users import create_user, get_user_by_email
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserPublic

router = APIRouter()


@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(data: UserCreate, db: Session = Depends(get_db)) -> UserPublic:
    """Register a new user account.

    Expects UserCreate and returns the public user representation.
    """
    if get_user_by_email(db, str(data.email)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = create_user(db, data)
    return UserPublic.model_validate(user)


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)) -> UserPublic:
    """Return the currently authenticated user."""
    return UserPublic.model_validate(current_user)
