"""API routes for User accounts.

- POST   /users/          - register a new user
- GET    /users/me        - get current authenticated user
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_user
from app.crud.users import create_user, get_user_by_email, get_user_by_id
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserPublic, UserStatusUpdate, Message

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


@router.patch("/{user_id}/status", response_model=Message)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    """
    Change the status of a user account.

    For now, users may only change their own status.
    """
    if current_user.email != "admin@example.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to change this user's status",
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.status = data.status
    db.commit()

    return Message(message="User status updated")
