"""add notifications tables

Revision ID: f1c3a8b72d14
Revises: e2a91d7c4f31
Create Date: 2026-02-26 15:35:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f1c3a8b72d14"
down_revision: Union[str, Sequence[str], None] = "e2a91d7c4f31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          event_type VARCHAR(32) NOT NULL,
          title VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          payload_json JSONB,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_notifications_user_created
        ON notifications(user_id, created_at DESC);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_notifications_user_unread
        ON notifications(user_id, is_read, created_at DESC);
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_device_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          platform VARCHAR(32),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_user_device_token_value UNIQUE (token)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_device_tokens_user
        ON user_device_tokens(user_id);
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS user_device_tokens;")
    op.execute("DROP TABLE IF EXISTS notifications;")
