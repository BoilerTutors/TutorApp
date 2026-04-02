"""API routes for TutorReport.

- POST  /reports/     - student files a report against a tutor
- GET   /reports/me   - get all reports filed by the current student
"""
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, TutorReport
from app.schemas import ReportCreate, ReportPublic
from app.crud import reports as crud_reports

router = APIRouter()


@router.post("/", response_model=ReportPublic, status_code=status.HTTP_201_CREATED)
def create_report(
    data: ReportCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TutorReport:
    """Student files a report against a tutor."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can file reports.",
        )
    if data.tutor_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report yourself.",
        )
    return crud_reports.create_report(db, current_user.id, data)


@router.get("/me", response_model=List[ReportPublic])
def get_my_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TutorReport]:
    """Get all reports filed by the current student."""
    return crud_reports.get_reports_by_reporter(db, current_user.id)