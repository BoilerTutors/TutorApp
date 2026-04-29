"""add users.stripe_account_id

Revision ID: f4c1b7a9d2e3
Revises: e294023af946
Create Date: 2026-04-29

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f4c1b7a9d2e3"
down_revision: Union[str, Sequence[str], None] = "e294023af946"
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
