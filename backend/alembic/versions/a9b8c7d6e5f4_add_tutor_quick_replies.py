"""add tutor quick replies

Revision ID: a9b8c7d6e5f4
Revises: f4c1b7a9d2e3
Create Date: 2026-04-29

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a9b8c7d6e5f4"
down_revision: Union[str, Sequence[str], None] = "f4c1b7a9d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.tutors
        ADD COLUMN IF NOT EXISTS quick_reply1 TEXT NOT NULL DEFAULT 'I am available for that time',
        ADD COLUMN IF NOT EXISTS quick_reply2 TEXT NOT NULL DEFAULT 'No, I am not available. Do you want to try a different time?',
        ADD COLUMN IF NOT EXISTS quick_reply3 TEXT NOT NULL DEFAULT 'Send me the lecture notes';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.tutors
        DROP COLUMN IF EXISTS quick_reply1,
        DROP COLUMN IF EXISTS quick_reply2,
        DROP COLUMN IF EXISTS quick_reply3;
        """
    )
