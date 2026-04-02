"""add accepted and declined tutoring session statuses

Revision ID: 7a1d2c3e4f5a
Revises: e61c2a8d44be
Create Date: 2026-04-02 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7a1d2c3e4f5a"
down_revision: Union[str, Sequence[str], None] = "e61c2a8d44be"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        UPDATE tutoring_sessions
        SET status = 'accepted'
        WHERE status = 'confirmed';
        """
    )
    op.execute(
        """
        ALTER TABLE tutoring_sessions
        DROP CONSTRAINT IF EXISTS ck_session_status;
        """
    )
    op.execute(
        """
        ALTER TABLE tutoring_sessions
        ADD CONSTRAINT ck_session_status
        CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled'));
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        UPDATE tutoring_sessions
        SET status = 'pending'
        WHERE status IN ('accepted', 'declined');
        """
    )
    op.execute(
        """
        ALTER TABLE tutoring_sessions
        DROP CONSTRAINT IF EXISTS ck_session_status;
        """
    )
    op.execute(
        """
        ALTER TABLE tutoring_sessions
        ADD CONSTRAINT ck_session_status
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));
        """
    )
