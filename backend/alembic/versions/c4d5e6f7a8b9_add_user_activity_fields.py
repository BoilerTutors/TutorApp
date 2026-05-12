"""add users activity fields

Revision ID: c4d5e6f7a8b9
Revises: b1c2d3e4f5a6
Create Date: 2026-04-30 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS active_now BOOLEAN NOT NULL DEFAULT FALSE;
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_users_active_now
        ON public.users (active_now);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_users_last_active_at
        ON public.users (last_active_at);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS public.ix_users_last_active_at;")
    op.execute("DROP INDEX IF EXISTS public.ix_users_active_now;")
    op.execute(
        """
        ALTER TABLE public.users
        DROP COLUMN IF EXISTS active_now,
        DROP COLUMN IF EXISTS last_active_at;
        """
    )

