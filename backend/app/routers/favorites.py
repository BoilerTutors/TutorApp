"""API routes for student favorites.

- POST   /favorites/{tutor_id}        - student adds a tutor to favorites
- DELETE /favorites/{tutor_id}        - student removes a tutor from favorites
- GET    /favorites/me                - list student's favorites with rich tutor info
- GET    /favorites/me/check/{tutor_id} - check if a tutor is already favorited
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.crud.favorites import (
    create_favorite,
    delete_favorite,
    get_favorite,
    list_favorites_for_student,
)
from app.database import get_db
from app.models import User
from app.schemas import FavoriteCheckPublic, FavoriteTutorPublic

router = APIRouter()


@router.get("/me", response_model=list[FavoriteTutorPublic])
def list_my_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FavoriteTutorPublic]:
    """Get the student's favorites with rich tutor info."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can view their favorites.",
        )
    rows = list_favorites_for_student(db, student_id=current_user.id)
    return [FavoriteTutorPublic(**r) for r in rows]


@router.get("/me/check/{tutor_id}", response_model=FavoriteCheckPublic)
def check_favorite(
    tutor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FavoriteCheckPublic:
    """Check if a tutor is in the current student's favorites."""
    if not current_user.is_student:
        return FavoriteCheckPublic(is_favorited=False)
    fav = get_favorite(db, student_id=current_user.id, tutor_id=tutor_id)
    return FavoriteCheckPublic(is_favorited=fav is not None)


@router.post(
    "/{tutor_id}",
    response_model=FavoriteCheckPublic,
    status_code=status.HTTP_201_CREATED,
)
def add_favorite(
    tutor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FavoriteCheckPublic:
    """Student adds a tutor to favorites."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can favorite tutors.",
        )
    if tutor_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot favorite yourself.",
        )
    tutor = db.get(User, tutor_id)
    if tutor is None or not tutor.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor not found.",
        )
    existing = get_favorite(db, student_id=current_user.id, tutor_id=tutor_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tutor is already in your favorites.",
        )
    create_favorite(db, student_id=current_user.id, tutor_id=tutor_id)
    return FavoriteCheckPublic(is_favorited=True)


@router.delete("/{tutor_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    tutor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Student removes a tutor from favorites."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can manage favorites.",
        )
    fav = get_favorite(db, student_id=current_user.id, tutor_id=tutor_id)
    if fav is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor is not in your favorites.",
        )
    delete_favorite(db, favorite=fav)