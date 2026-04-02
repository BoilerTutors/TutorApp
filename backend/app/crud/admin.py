from typing import Optional

from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import hash_password, verify_password
from app.models import Admin
from app.schemas import AdminCreate, AdminUpdate


def get_admin_by_email(db: Session, email: str) -> Optional[Admin]:
    return db.query(Admin).filter(Admin.email == email.strip().lower()).first()


def get_admin_by_id(db: Session, admin_id: int) -> Optional[Admin]:
    return db.get(Admin, admin_id)


def create_admin(db: Session, data: AdminCreate) -> Admin:
    email = str(data.email).strip().lower()
    existing = get_admin_by_email(db, email)
    if existing:
        raise ValueError("Email already registered")

    admin = Admin(
        email=email,
        hashed_password=hash_password(data.password),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def authenticate_admin(db: Session, email: str, password: str) -> Optional[Admin]:
    admin = get_admin_by_email(db, email)
    if not admin or not verify_password(password, admin.hashed_password):
        return None
    return admin


def update_admin(db: Session, admin: Admin, data: AdminUpdate) -> Admin:
    if data.email is not None:
        new_email = str(data.email).strip().lower()
        existing = get_admin_by_email(db, new_email)
        if existing and existing.id != admin.id:
            raise ValueError("Email already registered")
        admin.email = new_email

    if data.password is not None:
        admin.hashed_password = hash_password(data.password)

    db.commit()
    db.refresh(admin)
    return admin
