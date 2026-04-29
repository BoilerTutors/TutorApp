from sqlalchemy.orm import Session

from app.crud.notifications import create_notification
from app.models import Notification
from app.services.notification_ws import notification_ws_manager


async def emit_notification(user_id: int, notification: Notification) -> None:
    await notification_ws_manager.send_to_user(
        user_id,
        {
            "type": "notification",
            "notification": {
                "id": notification.id,
                "event_type": notification.event_type,
                "title": notification.title,
                "body": notification.body,
                "payload_json": notification.payload_json,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
            },
        },
    )


def build_and_store_notification(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    title: str,
    body: str,
    payload_json: dict | None = None,
) -> Notification:
    row = create_notification(
        db,
        user_id=user_id,
        event_type=event_type,
        title=title,
        body=body,
        payload_json=payload_json,
    )
    db.commit()
    db.refresh(row)
    return row
