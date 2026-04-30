"""Admin-only review moderation (flagged reviews)."""

from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.crud import reviews as crud_reviews
from app.database import get_db
from app.models import Admin, Review
from app.schemas import ReviewFlaggedAdmin

router = APIRouter()


def _to_flagged_admin(review: Review) -> ReviewFlaggedAdmin:
    session = review.session
    tutor = session.tutor
    student = session.student
    tutor_name = f"{tutor.first_name} {tutor.last_name}".strip()
    # Admins always see the real student; is_anonymous flags that the public listing hid the name.
    student_display = f"{student.first_name} {student.last_name}".strip()
    return ReviewFlaggedAdmin(
        id=review.id,
        session_id=review.session_id,
        subject=session.subject,
        rating=review.rating,
        comment=review.comment,
        is_anonymous=review.is_anonymous,
        is_flagged=review.is_flagged,
        flag_reason=review.flag_reason,
        created_at=review.created_at,
        tutor_name=tutor_name,
        student_display=student_display,
    )


@router.get("/reviews/flagged", response_model=List[ReviewFlaggedAdmin])
def list_flagged_reviews(
    _: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> List[ReviewFlaggedAdmin]:
    reviews = crud_reviews.get_flagged_reviews_for_admin(db)
    return [_to_flagged_admin(r) for r in reviews]


@router.post("/reviews/{review_id}/ignore", response_model=ReviewFlaggedAdmin)
def ignore_flagged_review(
    review_id: int,
    _: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ReviewFlaggedAdmin:
    """Clear the flag; the review remains visible."""
    review = crud_reviews.get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if not review.is_flagged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review is not flagged",
        )
    updated = crud_reviews.admin_clear_review_flag(db, review)
    return _to_flagged_admin(updated)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_review(
    review_id: int,
    _: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    review = crud_reviews.get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    crud_reviews.delete_review(db, review)
