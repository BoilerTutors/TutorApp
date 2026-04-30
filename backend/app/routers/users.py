"""API routes for User accounts.

- POST   /users/          - register a new user
- GET    /users/me        - get current authenticated user
- PATCH  /users/me        - update current user profile
- DELETE /users/me        - delete current user account (body: { "confirmation": "DELETE" })
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_admin, get_current_user
from app.crud.users import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_user_profile,
    delete_user,
    update_user_security_preferences,
    search_users,
    toggle_user_active_status,
)
from app.database import get_db
from app.models import Admin, User
from app.schemas import (
    AdminUserSearchPublic,
    UserCreate,
    UserPublic,
    Message,
    ProfileUpdate,
    DeleteAccountRequest,
    UserLookupPublic,
    UserProfileDetailsPublic,
    SecurityPreferencesUpdate,
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


@router.get("/admin/search", response_model=list[AdminUserSearchPublic])
def admin_search_users(
    q: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[AdminUserSearchPublic]:
    """Admin-only user search by first name, last name, or email."""
    _ = current_admin
    safe_limit = max(1, min(limit, 500))
    users = search_users(db, query=q, limit=safe_limit)
    return [AdminUserSearchPublic.model_validate(user) for user in users]


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
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> Message:
    """Admin-only toggle between active (0) and disabled (1) user status."""
    _ = current_admin
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    toggle_user_active_status(db, user)
    return Message(message="User status updated")


"""
- GET    /users/me/security-preferences - get current authenticated user's security preferences
- PUT    /users/me/security-preferences - update current user's security preferences
"""
@router.get("/me/security-preferences", status_code=status.HTTP_200_OK)
def get_security_preferences(current_user: User = Depends(get_current_user)) -> dict:
    """Return the current user's security preferences."""
    return {"mfa_enabled": current_user.mfa_enabled}


@router.put("/me/security-preferences", status_code=status.HTTP_200_OK)
def update_security_preferences(
    data: SecurityPreferencesUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ) -> dict:

    user = update_user_security_preferences(db, current_user, data)
    mfa_enabled = user.mfa_enabled
    return {"mfa_enabled": mfa_enabled}

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


@router.get("/{user_id}/profile", response_model=UserProfileDetailsPublic)
def get_user_profile_details(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileDetailsPublic:
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    avg_help_level: float | None = None
    if user.student and user.student.classes_enrolled:
        levels = [c.help_level for c in user.student.classes_enrolled if c.help_level is not None]
        if levels:
            avg_help_level = sum(levels) / len(levels)

    return UserProfileDetailsPublic(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        is_tutor=user.is_tutor,
        is_student=user.is_student,
        tutor=user.tutor,
        student=user.student,
        student_average_help_level=avg_help_level,
    )
