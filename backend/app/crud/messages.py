from typing import Optional
"""CRUD for messaging: conversations and messages.

- get_or_create_conversation(user1_id, user2_id)
- get_conversation_by_id(conversation_id, user_id)  # only if user is participant
- list_conversations_for_user(user_id)
- get_messages(conversation_id, user_id, skip, limit)
- create_message(conversation_id, sender_id, content)
"""
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Conversation, Message, User


def _canonical_pair(user_id_a: int, user_id_b: int) -> tuple[int, int]:
    """Return (user1_id, user2_id) with user1_id < user2_id."""
    if user_id_a == user_id_b:
        raise ValueError("Cannot create conversation with yourself")
    return (min(user_id_a, user_id_b), max(user_id_a, user_id_b))


def get_or_create_conversation(db: Session, user1_id: int, user2_id: int) -> Conversation:
    """Get existing conversation between two users or create one. user1_id/user2_id order is normalized."""
    u1, u2 = _canonical_pair(user1_id, user2_id)
    stmt = select(Conversation).where(
        Conversation.user1_id == u1,
        Conversation.user2_id == u2,
    )
    conv = db.execute(stmt).scalar_one_or_none()
    if conv is not None:
        return conv
    conv = Conversation(user1_id=u1, user2_id=u2)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def get_conversation_by_id(db: Session, conversation_id: int, user_id: int) -> Optional[Conversation]:
    """Return conversation if it exists and user_id is user1 or user2."""
    conv = db.get(Conversation, conversation_id)
    if conv is None:
        return None
    if user_id not in (conv.user1_id, conv.user2_id):
        return None
    return conv


def list_conversations_for_user(db: Session, user_id: int):
    """List conversations for user. Returns list of dicts with conversation, other_user_id, last_message."""
    stmt = (
        select(Conversation)
        .where((Conversation.user1_id == user_id) | (Conversation.user2_id == user_id))
        .order_by(desc(Conversation.updated_at))
    )
    conversations = list(db.execute(stmt).scalars().all())
    result = []
    for conv in conversations:
        other_id = conv.user2_id if conv.user1_id == user_id else conv.user1_id
        last_msg = (
            db.execute(
                select(Message)
                .where(Message.conversation_id == conv.id)
                .order_by(desc(Message.created_at))
                .limit(1)
            )
            .scalar_one_or_none()
        )
        result.append({
            "id": conv.id,
            "user1_id": conv.user1_id,
            "user2_id": conv.user2_id,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "other_user_id": other_id,
            "last_message": last_msg,
        })
    return result


def get_messages(
    db: Session,
    conversation_id: int,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
) -> list[Message]:
    """Return messages in conversation (oldest first). Only if user is a participant."""
    conv = get_conversation_by_id(db, conversation_id, user_id)
    if conv is None:
        return []
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .offset(skip)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def create_message(
    db: Session,
    conversation_id: int,
    sender_id: int,
    content: str,
) -> Optional[Message]:
    """Add a message. Returns None if conversation doesn't exist or sender is not a participant."""
    conv = get_conversation_by_id(db, conversation_id, sender_id)
    if conv is None:
        return None
    msg = Message(conversation_id=conversation_id, sender_id=sender_id, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
