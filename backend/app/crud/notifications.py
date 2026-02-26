from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Notification, UserDeviceToken, UserNotificationSetting


def create_notification(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    title: str,
    body: str,
    payload_json: dict | None = None,
) -> Notification:
    row = Notification(
        user_id=user_id,
        event_type=event_type,
        title=title,
        body=body,
        payload_json=payload_json,
    )
    db.add(row)
    db.flush()
    return row


def list_notifications_for_user(db: Session, *, user_id: int, limit: int = 50) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(desc(Notification.created_at), desc(Notification.id))
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def mark_notification_read(db: Session, *, notification_id: int, user_id: int) -> Notification | None:
    row = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if row is None:
        return None
    row.is_read = True
    db.commit()
    db.refresh(row)
    return row


def upsert_device_token(
    db: Session,
    *,
    user_id: int,
    token: str,
    platform: str | None = None,
) -> UserDeviceToken:
    row = db.query(UserDeviceToken).filter(UserDeviceToken.token == token).first()
    if row is None:
        row = UserDeviceToken(user_id=user_id, token=token, platform=platform)
        db.add(row)
    else:
        row.user_id = user_id
        row.platform = platform
    db.commit()
    db.refresh(row)
    return row


def get_or_create_notification_settings(db: Session, *, user_id: int) -> UserNotificationSetting:
    row = (
        db.query(UserNotificationSetting)
        .filter(UserNotificationSetting.user_id == user_id)
        .first()
    )
    if row is not None:
        return row
    row = UserNotificationSetting(user_id=user_id, email_digest_enabled=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_notification_settings(
    db: Session,
    *,
    user_id: int,
    email_digest_enabled: bool,
) -> UserNotificationSetting:
    row = (
        db.query(UserNotificationSetting)
        .filter(UserNotificationSetting.user_id == user_id)
        .first()
    )
    if row is None:
        row = UserNotificationSetting(
            user_id=user_id,
            email_digest_enabled=email_digest_enabled,
        )
        db.add(row)
    else:
        row.email_digest_enabled = email_digest_enabled
    db.commit()
    db.refresh(row)
    return row
