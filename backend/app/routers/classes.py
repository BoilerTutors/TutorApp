"""API routes for Class, StudentClass, and TutorClass."""
"""
- POST   /classes/                    - create a new class
- GET    /classes/                    - list/search classes
- GET    /classes/{class_id}          - get class details
- POST   /classes/student/            - student enrolls in a class
- GET    /classes/student/me          - get current student's classes
- DELETE /classes/student/{id}        - remove student class enrollment
- POST   /classes/tutor/              - tutor adds a class they can teach
- GET    /classes/tutor/me            - get current tutor's classes
- DELETE /classes/tutor/{id}          - remove tutor class entry
"""
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    ClassCreate, ClassPublic,
    StudentClassCreate, StudentClassPublic,
    TutorClassCreate, TutorClassPublic,
)
from app.crud import classes as crud_classes
from app.crud import tutors as crud_tutors
from app.crud.classes import list_classes

router = APIRouter()


# ==========================
# Class routes
# ==========================

@router.post("/", response_model=ClassPublic, status_code=status.HTTP_201_CREATED)
def create_class(
    data: ClassCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ClassPublic:
    """Create a new class."""
    try:
        return crud_classes.create_class(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[ClassPublic])
def list_classes(
    db: Annotated[Session, Depends(get_db)],
    subject: Optional[str] = Query(None, description="Filter by subject (e.g., CS, MA)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> List[ClassPublic]:
    """List all classes with optional filters."""
    return crud_classes.list_classes(db, subject=subject, skip=skip, limit=limit)


@router.get("/{class_id}", response_model=ClassPublic)
def get_class(
    class_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> ClassPublic:
    """Get a class by ID."""
    class_ = crud_classes.get_class_by_id(db, class_id)
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )
    return class_


# ==========================
# StudentClass routes
# ==========================

@router.post("/student/", response_model=StudentClassPublic, status_code=status.HTTP_201_CREATED)
def add_student_class(
    data: StudentClassCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentClassPublic:
    """Student enrolls in a class."""
    if not current_user.is_student or not current_user.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can enroll in classes",
        )
    try:
        return crud_classes.add_student_class(db, current_user.student.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/student/me", response_model=List[StudentClassPublic])
def get_my_student_classes(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[StudentClassPublic]:
    """Get the current student's enrolled classes."""
    if not current_user.is_student or not current_user.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can view their classes",
        )
    return crud_classes.get_student_classes_by_student_id(db, current_user.student.id)


@router.delete("/student/{student_class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_class(
    student_class_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Remove a student's class enrollment."""
    student_class = crud_classes.get_student_class_by_id(db, student_class_id)
    if not student_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student class not found",
        )
    if not current_user.student or student_class.student_id != current_user.student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own class enrollments",
        )
    crud_classes.delete_student_class(db, student_class)


# ==========================
# TutorClass routes
# ==========================

@router.post("/tutor/", response_model=TutorClassPublic, status_code=status.HTTP_201_CREATED)
def add_tutor_class(
    data: TutorClassCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TutorClassPublic:
    """Tutor adds a class they can teach."""
    if not current_user.is_tutor or not current_user.tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can add classes to teach",
        )
    try:
        return crud_classes.add_tutor_class(db, current_user.tutor.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/tutor/me", response_model=List[TutorClassPublic])
def get_my_tutor_classes(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[TutorClassPublic]:
    """Get the current tutor's classes they teach."""
    if not current_user.is_tutor or not current_user.tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view their teaching classes",
        )
    return crud_classes.get_tutor_classes_by_tutor_id(db, current_user.tutor.id)


@router.delete("/tutor/{tutor_class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutor_class(
    tutor_class_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Remove a tutor's class entry."""
    tutor_class = crud_classes.get_tutor_class_by_id(db, tutor_class_id)
    if not tutor_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor class not found",
        )
    if not current_user.tutor or tutor_class.tutor_id != current_user.tutor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own teaching classes",
        )
    crud_classes.delete_tutor_class(db, tutor_class)
