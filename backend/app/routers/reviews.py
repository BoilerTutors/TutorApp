"""API routes for Review.

- POST   /reviews/                  - student submits a review for a session
- GET    /reviews/{review_id}       - get a single review
- GET    /reviews/tutor/{user_id}   - get all reviews for a tutor
- GET    /reviews/student/me        - get all reviews written by current user
- PATCH  /reviews/{review_id}       - update own review
- DELETE /reviews/{review_id}       - delete own review
"""
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Review
from app.schemas import ReviewCreate, ReviewUpdate, ReviewPublic
from app.crud import reviews as crud_reviews

router = APIRouter()


@router.post("/", response_model=ReviewPublic, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Review:
    """Student submits a review for a completed tutoring session."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create reviews",
        )
    try:
        return crud_reviews.create_review(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{review_id}", response_model=ReviewPublic)
def get_review(
    review_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> Review:
    """Get a single review by ID."""
    review = crud_reviews.get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    return review


@router.get("/tutor/{user_id}", response_model=List[ReviewPublic])
def get_reviews_for_tutor(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[Review]:
    """Get all reviews for a tutor."""
    return crud_reviews.get_reviews_by_tutor(db, user_id)


@router.get("/student/me", response_model=List[ReviewPublic])
def get_my_reviews(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[Review]:
    """Get all reviews written by the current user."""
    return crud_reviews.get_reviews_by_student(db, current_user.id)


@router.patch("/{review_id}", response_model=ReviewPublic)
def update_review(
    review_id: int,
    data: ReviewUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Review:
    """Update own review."""
    review = crud_reviews.get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    # Check ownership: the review's session's student must be current user
    if review.session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reviews",
        )
    return crud_reviews.update_review(db, review, data)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete own review."""
    review = crud_reviews.get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    # Check ownership
    if review.session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews",
        )
    crud_reviews.delete_review(db, review)