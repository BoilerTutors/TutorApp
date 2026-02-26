"""add email digest frequency

Revision ID: e61c2a8d44be
Revises: d7f4bcaa91c1
Create Date: 2026-02-26 20:40:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e61c2a8d44be"
down_revision: Union[str, Sequence[str], None] = "d7f4bcaa91c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        ALTER TABLE user_notification_settings
        ADD COLUMN IF NOT EXISTS email_digest_frequency VARCHAR(16) NOT NULL DEFAULT 'daily';
        """
    )
    op.execute(
        """
        ALTER TABLE user_notification_settings
        DROP CONSTRAINT IF EXISTS ck_email_digest_frequency;
        """
    )
    op.execute(
        """
        ALTER TABLE user_notification_settings
        ADD CONSTRAINT ck_email_digest_frequency
        CHECK (email_digest_frequency IN ('12h', 'daily', 'weekly'));
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        ALTER TABLE user_notification_settings
        DROP CONSTRAINT IF EXISTS ck_email_digest_frequency;
        """
    )
    op.execute(
        """
        ALTER TABLE user_notification_settings
        DROP COLUMN IF EXISTS email_digest_frequency;
        """
    )
