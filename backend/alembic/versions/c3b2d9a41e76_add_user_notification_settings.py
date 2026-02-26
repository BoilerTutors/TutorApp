"""add user notification settings

Revision ID: c3b2d9a41e76
Revises: f1c3a8b72d14
Create Date: 2026-02-26 18:05:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c3b2d9a41e76"
down_revision: Union[str, Sequence[str], None] = "f1c3a8b72d14"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_notification_settings (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          email_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS user_notification_settings;")
