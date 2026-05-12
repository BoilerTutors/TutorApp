from sqlalchemy import desc
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models import AdminMessage


def create_admin_message(
    db: Session,
    *,
    student_id: int,
    tutor_id: int,
    message: str,
    refund_requested: bool,
) -> AdminMessage:
    row = AdminMessage(
        student_id=student_id,
        tutor_id=tutor_id,
        message=message,
        refund_requested=refund_requested,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_admin_messages(db: Session, *, limit: int = 200) -> list[AdminMessage]:
    return (
        db.query(AdminMessage)
        .order_by(desc(AdminMessage.created_at), desc(AdminMessage.id))
        .limit(limit)
        .all()
    )


def list_admin_messages_for_user(db: Session, *, user_id: int, limit: int = 200) -> list[AdminMessage]:
    return (
        db.query(AdminMessage)
        .filter((AdminMessage.student_id == user_id) | (AdminMessage.tutor_id == user_id))
        .order_by(desc(AdminMessage.created_at), desc(AdminMessage.id))
        .limit(limit)
        .all()
    )


def set_admin_message_response(
    db: Session,
    *,
    row: AdminMessage,
    response_message: str,
) -> AdminMessage:
    row.admin_response = response_message
    row.responded_at = func.now()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
