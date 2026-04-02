from sqlalchemy import desc
from sqlalchemy.orm import Session

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
