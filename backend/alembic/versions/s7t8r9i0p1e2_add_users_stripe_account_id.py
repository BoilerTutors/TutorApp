"""add users.stripe_account_id

Revision ID: s7t8r9i0p1e2
Revises: 8b7c6d5e4f3a, h9i0j1k2l3m4
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op


revision: str = "s7t8r9i0p1e2"
down_revision: Union[str, Sequence[str], None] = ("8b7c6d5e4f3a", "h9i0j1k2l3m4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255) NULL;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_stripe_account_id'
            ) THEN
                ALTER TABLE public.users
                ADD CONSTRAINT uq_users_stripe_account_id UNIQUE (stripe_account_id);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE public.users DROP CONSTRAINT IF EXISTS uq_users_stripe_account_id;"
    )
    op.execute(
        "ALTER TABLE public.users DROP COLUMN IF EXISTS stripe_account_id;"
    )
