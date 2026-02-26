"""API routes for TutorProfile.

- POST   /tutors/              - create tutor profile for current user
- GET    /tutors/              - list/search tutors (filters: subject, rating)
- GET    /tutors/{tutor_id}    - get tutor profile by ID
- PATCH  /tutors/me            - update own tutor profile
- DELETE /tutors/me            - delete own tutor profile
"""
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, TutorProfile
from app.schemas import TutorProfileCreate, TutorProfileUpdate, TutorProfilePublic
from app.crud import tutors as crud_tutors

router = APIRouter()


@router.post("/", response_model=TutorProfilePublic, status_code=status.HTTP_201_CREATED)
def create_tutor_profile(
    data: TutorProfileCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TutorProfile:
    """Create a tutor profile for the current user."""
    try:
        return crud_tutors.create_tutor_profile(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[TutorProfilePublic])
def list_tutors(
    db: Annotated[Session, Depends(get_db)],
    subject: Optional[str] = Query(None, description="Filter by subject (e.g., CS, MA, PHYS)"),
    min_rating: Optional[float] = Query(None, ge=1.0, le=5.0, description="Minimum average rating"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> List[TutorProfile]:
    """List tutors with optional filters."""
    return crud_tutors.list_tutors(db, subject=subject, min_rating=min_rating, skip=skip, limit=limit)


@router.get("/me", response_model=TutorProfilePublic)
def get_my_tutor_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TutorProfile:
    """Get the current user's tutor profile."""
    tutor = crud_tutors.get_tutor_profile_by_user_id(db, current_user.id)
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor profile not found",
        )
    return tutor


@router.get("/{tutor_id}", response_model=TutorProfilePublic)
def get_tutor_profile(
    tutor_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> TutorProfile:
    """Get a tutor profile by ID."""
    tutor = crud_tutors.get_tutor_profile_by_id(db, tutor_id)
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor profile not found",
        )
    return tutor


@router.patch("/me", response_model=TutorProfilePublic)
def update_my_tutor_profile(
    data: TutorProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TutorProfile:
    """Update the current user's tutor profile."""
    tutor = crud_tutors.get_tutor_profile_by_user_id(db, current_user.id)
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor profile not found",
        )
    return crud_tutors.update_tutor_profile(db, tutor, data)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_tutor_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete the current user's tutor profile."""
    tutor = crud_tutors.get_tutor_profile_by_user_id(db, current_user.id)
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor profile not found",
        )
    crud_tutors.delete_tutor_profile(db, tutor)
