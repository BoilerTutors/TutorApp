"""add message attachments

Revision ID: d7f4bcaa91c1
Revises: c3b2d9a41e76
Create Date: 2026-02-26 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d7f4bcaa91c1"
down_revision: Union[str, Sequence[str], None] = "c3b2d9a41e76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS message_attachments (
          id SERIAL PRIMARY KEY,
          message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          size_bytes INTEGER NOT NULL,
          storage_path VARCHAR(1024) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_message_attachments_message_id UNIQUE (message_id)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_message_attachments_id
        ON message_attachments(id);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_message_attachments_message_id
        ON message_attachments(message_id);
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS message_attachments;")
