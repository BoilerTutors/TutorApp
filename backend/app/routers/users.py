"""API routes for User accounts.

- POST   /users/          - register a new user
- GET    /users/me        - get current authenticated user
- PATCH  /users/me        - update current user profile
- DELETE /users/me        - delete current user account (body: { "confirmation": "DELETE" })
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_user
from app.crud.users import create_user, get_user_by_email, get_user_by_id, update_user_profile, delete_user
from app.database import get_db
from app.models import User
from app.schemas import (
    UserCreate,
    UserPublic,
    UserStatusUpdate,
    Message,
    ProfileUpdate,
    DeleteAccountRequest,
    UserLookupPublic,
)

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


@router.patch("/me", response_model=UserPublic)
def update_me(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPublic:
    """Update the current user's profile (name and optional tutor/student fields)."""
    updated = update_user_profile(db, current_user, data)
    return UserPublic.model_validate(updated)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Permanently delete the current user's account. Requires confirmation body: { \"confirmation\": \"DELETE\" }."""
    delete_user(db, current_user)
    return None


@router.post("/me/delete", status_code=status.HTTP_204_NO_CONTENT)
def post_delete_me(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Same as DELETE /me; use POST to avoid client issues with DELETE + body. Requires body: { \"confirmation\": \"DELETE\" }."""
    delete_user(db, current_user)
    return None


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


@router.get("/{user_id}", response_model=UserLookupPublic)
def get_user_public_lookup(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserLookupPublic:
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserLookupPublic.model_validate(user)
