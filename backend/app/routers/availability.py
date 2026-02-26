"""API routes for UserAvailability time slots."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_user
from app.crud.availability import (
    create_availability,
    get_availability_by_user_id,
    delete_availability,
)
from app.database import get_db
from app.models import User
from app.schemas import AvailabilityCreate, AvailabilityPublic

router = APIRouter()


@router.get("/me", response_model=list[AvailabilityPublic])
def get_my_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AvailabilityPublic]:
    """Return the current user's availability slots."""
    slots = get_availability_by_user_id(db, current_user.id)
    return [AvailabilityPublic.model_validate(s) for s in slots]


@router.get("/users/{user_id}", response_model=list[AvailabilityPublic])
def get_user_availability(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AvailabilityPublic]:
    """
    Return availability slots for a specific user.
    Used by tutor-side messaging to inspect a student's availability.
    """
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    slots = get_availability_by_user_id(db, user_id)
    return [AvailabilityPublic.model_validate(s) for s in slots]


@router.post("/", response_model=AvailabilityPublic, status_code=status.HTTP_201_CREATED)
def add_availability(
    data: AvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AvailabilityPublic:
    """Add an availability slot for the current user."""
    slot = create_availability(db, current_user.id, data)
    return AvailabilityPublic.model_validate(slot)


@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_availability(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove an availability slot. Only the owner can delete."""
    if not delete_availability(db, slot_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Availability slot not found",
        )
