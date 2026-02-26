"""API routes for Class, StudentClass, and TutorClass."""
from fastapi import APIRouter, Depends, Query

from sqlalchemy.orm import Session

from app.crud.classes import list_classes
from app.database import get_db
from app.schemas import ClassPublic

router = APIRouter()


@router.get("/", response_model=list[ClassPublic])
def get_classes(
    subject: str | None = Query(default=None, description="Filter by subject (e.g. CS)"),
    professor: str | None = Query(default=None, description="Filter by professor"),
    db: Session = Depends(get_db),
) -> list[ClassPublic]:
    """List all available classes, optionally filtered by subject or professor."""
    classes = list_classes(db, subject=subject, professor=professor)
    return [ClassPublic.model_validate(c) for c in classes]
