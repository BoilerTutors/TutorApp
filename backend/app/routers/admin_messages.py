"""API routes for user-to-admin messages.

- POST /admin-messages/  - student submits about a matched tutor (body.tutor_id), or
                             tutor submits about a matched student (body.student_id)
- GET  /admin-messages/  - admin lists all submitted messages
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin, get_current_user
from app.crud.admin_messages import create_admin_message, list_admin_messages
from app.crud.matches import has_student_matched_tutor
from app.database import get_db
from app.models import Admin, User
from app.schemas import AdminMessageCreate, AdminMessagePublic

router = APIRouter()


@router.post("/", response_model=AdminMessagePublic, status_code=status.HTTP_201_CREATED)
def create_user_admin_message(
    body: AdminMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdminMessagePublic:
    has_tutor_target = body.tutor_id is not None
    has_student_target = body.student_id is not None
    if has_tutor_target and has_student_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specify only tutor_id or student_id, not both.",
        )
    if not has_tutor_target and not has_student_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tutor_id (students) or student_id (tutors) is required.",
        )

    if has_tutor_target:
        assert body.tutor_id is not None
        if not current_user.is_student:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can send admin messages with tutor_id.",
            )
        if body.tutor_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot submit an admin message about yourself.",
            )
        tutor = db.get(User, body.tutor_id)
        if tutor is None or not tutor.is_tutor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tutor not found.",
            )
        if not has_student_matched_tutor(
            db,
            student_id=current_user.id,
            tutor_id=body.tutor_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only message admin about tutors you are currently matched with.",
            )

        row = create_admin_message(
            db,
            student_id=current_user.id,
            tutor_id=body.tutor_id,
            message=body.message.strip(),
            refund_requested=body.refund_requested,
        )
        return AdminMessagePublic.model_validate(row)

    assert body.student_id is not None
    if not current_user.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can send admin messages with student_id.",
        )
    student_user = db.get(User, body.student_id)
    if student_user is None or not student_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )
    if body.student_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot submit an admin message about yourself.",
        )
    if not has_student_matched_tutor(
        db,
        student_id=body.student_id,
        tutor_id=current_user.id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only message admin about students you are currently matched with.",
        )

    row = create_admin_message(
        db,
        student_id=body.student_id,
        tutor_id=current_user.id,
        message=body.message.strip(),
        refund_requested=body.refund_requested,
    )
    return AdminMessagePublic.model_validate(row)


@router.get("/", response_model=list[AdminMessagePublic])
def get_admin_messages(
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[AdminMessagePublic]:
    _ = current_admin
    rows = list_admin_messages(db, limit=limit)
    return [AdminMessagePublic.model_validate(row) for row in rows]
