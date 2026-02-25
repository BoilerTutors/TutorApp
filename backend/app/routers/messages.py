"""REST and WebSocket messaging.

REST:
- GET    /messages/conversations           - list my conversations
- POST   /messages/conversations           - get or create conversation with another user
- GET    /messages/conversations/{id}      - get conversation (metadata)
- GET    /messages/conversations/{id}/messages - list messages (paginated)
- POST   /messages/conversations/{id}/messages - send a message

WebSocket:
- WS     /messages/ws/chat/{pairing_id}    - real-time chat (pairing_id = conversation_id)
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.crud import messages as crud_messages
from app.models import User
from app.schemas import (
    ConversationCreate,
    ConversationPublic,
    ConversationWithPartner,
    MessageCreate,
    MessagePublic,
)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # active_connections stores {pairing_id: [list_of_websockets]}
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, pairing_id: int):
        await websocket.accept()
        if pairing_id not in self.active_connections:
            self.active_connections[pairing_id] = []
        self.active_connections[pairing_id].append(websocket)

    def disconnect(self, websocket: WebSocket, pairing_id: int):
        self.active_connections[pairing_id].remove(websocket)

    async def broadcast(self, message: dict, pairing_id: int):
        if pairing_id in self.active_connections:
            for connection in self.active_connections[pairing_id]:
                await connection.send_json(message)

manager = ConnectionManager()


# ---------- REST endpoints ----------

@router.get("/conversations", response_model=list[ConversationWithPartner])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all conversations for the current user, with last message preview."""
    rows = crud_messages.list_conversations_for_user(db, current_user.id)
    return [
        ConversationWithPartner(
            id=r["id"],
            user1_id=r["user1_id"],
            user2_id=r["user2_id"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            other_user_id=r["other_user_id"],
            last_message=MessagePublic.model_validate(r["last_message"]) if r["last_message"] else None,
        )
        for r in rows
    ]


@router.post("/conversations", response_model=ConversationPublic)
def create_or_get_conversation(
    body: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get existing conversation with another user or create a new one."""
    try:
        conv = crud_messages.get_or_create_conversation(db, current_user.id, body.other_user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ConversationPublic.model_validate(conv)


@router.get("/conversations/{conversation_id}", response_model=ConversationPublic)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a conversation by id (only if current user is a participant)."""
    conv = crud_messages.get_conversation_by_id(db, conversation_id, current_user.id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationPublic.model_validate(conv)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessagePublic])
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List messages in a conversation (oldest first). Paginated."""
    messages = crud_messages.get_messages(db, conversation_id, current_user.id, skip=skip, limit=limit)
    return [MessagePublic.model_validate(m) for m in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=MessagePublic)
def send_message(
    conversation_id: int,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message in a conversation."""
    msg = crud_messages.create_message(db, conversation_id, current_user.id, body.content)
    if msg is None:
        raise HTTPException(status_code=404, detail="Conversation not found or you are not a participant")
    return MessagePublic.model_validate(msg)


# ---------- WebSocket ----------

@router.websocket("/ws/chat/{pairing_id}")
async def websocket_endpoint(websocket: WebSocket, pairing_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, pairing_id)
    try:
        while True:
            # Receive data from the client
            data = await websocket.receive_json()
            
            # 1. Save to Postgres via your CRUD logic
            # new_msg = crud.messages.create_message(db, content=data['text'], sender_id=data['sender_id'])
            
            # 2. Broadcast to the "Room"
            await manager.broadcast(data, pairing_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, pairing_id)