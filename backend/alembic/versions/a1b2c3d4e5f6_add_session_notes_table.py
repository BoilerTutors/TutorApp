"""add session_notes table

Revision ID: a1b2c3d4e5f6
Revises: f4c1b7a9d2e3
Create Date: 2026-04-29
"""
from typing import Sequence, Union
from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = ("f4c1b7a9d2e3", "s7t8r9i0p1e2")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.session_notes (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES public.tutoring_sessions(id) ON DELETE CASCADE,
            tutor_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            subject VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_session_note_per_session UNIQUE (session_id)
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_session_notes_session_id ON public.session_notes(session_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_session_notes_tutor_id ON public.session_notes(tutor_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_session_notes_student_id ON public.session_notes(student_id);"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.session_notes;")