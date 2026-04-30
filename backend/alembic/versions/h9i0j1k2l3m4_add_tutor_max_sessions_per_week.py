"""add tutors.max_sessions_per_week

Revision ID: h9i0j1k2l3m4
Revises: g7h8i9j0k1l2
Create Date: 2026-04-02 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "h9i0j1k2l3m4"
down_revision: Union[str, Sequence[str], None] = "g7h8i9j0k1l2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.tutors
        ADD COLUMN IF NOT EXISTS max_sessions_per_week INTEGER NULL;
        """
    )
    # Schema drift: constraint may already exist from a prior partial run or manual SQL.
    op.execute(
        """
        DO $body$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint c
                JOIN pg_class rel ON rel.oid = c.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE c.conname = 'ck_tutors_max_sessions_per_week_range'
                  AND nsp.nspname = 'public'
                  AND rel.relname = 'tutors'
            ) THEN
                ALTER TABLE public.tutors
                ADD CONSTRAINT ck_tutors_max_sessions_per_week_range
                CHECK (
                    max_sessions_per_week IS NULL
                    OR (max_sessions_per_week >= 1 AND max_sessions_per_week <= 168)
                )
                NOT VALID;
            END IF;
        END
        $body$;
        """
    )
    op.execute(
        """
        DO $body$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_constraint c
                JOIN pg_class rel ON rel.oid = c.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE c.conname = 'ck_tutors_max_sessions_per_week_range'
                  AND nsp.nspname = 'public'
                  AND rel.relname = 'tutors'
            ) THEN
                ALTER TABLE public.tutors
                VALIDATE CONSTRAINT ck_tutors_max_sessions_per_week_range;
            END IF;
        END
        $body$;
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE public.tutors DROP CONSTRAINT IF EXISTS ck_tutors_max_sessions_per_week_range;"
    )
    op.execute(
        "ALTER TABLE public.tutors DROP COLUMN IF EXISTS max_sessions_per_week;"
    )
