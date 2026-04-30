"""API routes for Review.

- POST   /reviews/                    - student submits a review for a session
- GET    /reviews/{review_id}         - get a single review
- GET    /reviews/tutor/{user_id}   - get all reviews for a tutor
- GET    /reviews/student/me         - get all reviews written by current user
- PATCH  /reviews/{review_id}        - update own review
- DELETE /reviews/{review_id}        - delete own review
- POST   /reviews/{review_id}/flag   - tutor flags a review for admin attention
"""
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_user_optional
from app.database import get_db
from app.models import User, Review
from app.schemas import ReviewCreate, ReviewUpdate, ReviewPublic, ReviewFlagCreate
from app.crud import reviews as crud_reviews

router = APIRouter()


def _review_public(review: Review, viewer: Optional[User]) -> ReviewPublic:
    """Flag fields are only visible to the tutor who received the review."""
    show_flag_meta = viewer is not None and review.session.tutor_id == viewer.id
    return ReviewPublic(
        id=review.id,
        session_id=review.session_id,
        class_id=review.class_id,
        rating=review.rating,
        comment=review.comment,
        is_anonymous=review.is_anonymous,
        is_flagged=review.is_flagged if show_flag_meta else False,
        flag_reason=review.flag_reason if show_flag_meta else None,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.post("/", response_model=ReviewPublic, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReviewPublic:
    """Student submits a review for a completed tutoring session."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create reviews",
        )
    try:
        review = crud_reviews.create_review(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _review_public(review, current_user)


@router.get("/{review_id}", response_model=ReviewPublic)
def get_review(
    review_id: int,
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[Optional[User], Depends(get_current_user_optional)],
) -> ReviewPublic:
    """Get a single review by ID."""
    review = crud_reviews.get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    return _review_public(review, viewer)


@router.get("/tutor/{user_id}", response_model=List[ReviewPublic])
def get_reviews_for_tutor(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[Optional[User], Depends(get_current_user_optional)],
) -> List[ReviewPublic]:
    """Get all reviews for a tutor."""
    reviews = crud_reviews.get_reviews_by_tutor(db, user_id)
    return [_review_public(r, viewer) for r in reviews]


@router.get("/student/me", response_model=List[ReviewPublic])
def get_my_reviews(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[ReviewPublic]:
    """Get all reviews written by the current user."""
    reviews = crud_reviews.get_reviews_by_student(db, current_user.id)
    return [_review_public(r, current_user) for r in reviews]


@router.patch("/{review_id}", response_model=ReviewPublic)
def update_review(
    review_id: int,
    data: ReviewUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReviewPublic:
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
    updated = crud_reviews.update_review(db, review, data)
    return _review_public(updated, current_user)


@router.post("/{review_id}/flag", response_model=ReviewPublic)
def flag_review(
    review_id: int,
    data: ReviewFlagCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReviewPublic:
    """Tutor flags an unfair or inappropriate review for admin review."""
    if not current_user.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can flag reviews",
        )
    review = crud_reviews.get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    reason = data.reason.strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason cannot be empty",
        )
    try:
        crud_reviews.flag_review_by_tutor(db, review, current_user.id, reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _review_public(review, current_user)


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
