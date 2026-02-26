from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_user_from_token
from app.crud.notifications import (
    get_or_create_notification_settings,
    list_notifications_for_user,
    mark_notification_read,
    update_notification_settings,
    upsert_device_token,
)
from app.database import get_db
from app.models import User
from app.schemas import (
    DeviceTokenPublic,
    DeviceTokenRegisterRequest,
    NotificationPublic,
    NotificationPreferencesPublic,
    NotificationPreferencesUpdate,
)
from app.services.notification_ws import notification_ws_manager

router = APIRouter()


@router.post("/device-tokens", response_model=DeviceTokenPublic)
def register_device_token(
    body: DeviceTokenRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeviceTokenPublic:
    row = upsert_device_token(
        db,
        user_id=current_user.id,
        token=body.token,
        platform=body.platform,
    )
    return row


@router.get("/me", response_model=list[NotificationPublic])
def get_my_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationPublic]:
    return list_notifications_for_user(db, user_id=current_user.id, limit=limit)


@router.patch("/{notification_id}/read", response_model=NotificationPublic)
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationPublic:
    row = mark_notification_read(db, notification_id=notification_id, user_id=current_user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return row


@router.get("/preferences/me", response_model=NotificationPreferencesPublic)
def get_my_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesPublic:
    row = get_or_create_notification_settings(db, user_id=current_user.id)
    return row


@router.put("/preferences/me", response_model=NotificationPreferencesPublic)
def put_my_notification_preferences(
    body: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesPublic:
    row = update_notification_settings(
        db,
        user_id=current_user.id,
        email_digest_enabled=body.email_digest_enabled,
        email_digest_frequency=body.email_digest_frequency,
    )
    return row


@router.websocket("/ws")
async def notifications_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
) -> None:
    user = get_user_from_token(token, db)
    await notification_ws_manager.connect(websocket, user.id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_ws_manager.disconnect(websocket, user.id)
