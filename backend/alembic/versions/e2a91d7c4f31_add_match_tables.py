"""add match tables

Revision ID: e2a91d7c4f31
Revises: b7d4a1c6f9e2
Create Date: 2026-02-26 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e2a91d7c4f31"
down_revision: Union[str, Sequence[str], None] = "b7d4a1c6f9e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS match_runs (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          model_name VARCHAR(128) NOT NULL DEFAULT 'local-hash-v1',
          top_k INTEGER NOT NULL,
          weights_json JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_match_runs_student_created
        ON match_runs(student_id, created_at DESC);
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS matches (
          id SERIAL PRIMARY KEY,
          run_id INTEGER NOT NULL REFERENCES match_runs(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rank INTEGER NOT NULL,
          similarity_score DOUBLE PRECISION NOT NULL,
          embedding_similarity DOUBLE PRECISION,
          class_strength DOUBLE PRECISION,
          availability_overlap DOUBLE PRECISION,
          location_match DOUBLE PRECISION,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_matches_run_rank UNIQUE (run_id, rank),
          CONSTRAINT uq_matches_run_tutor UNIQUE (run_id, tutor_id)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_matches_student_score
        ON matches(student_id, similarity_score DESC);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_matches_run_rank
        ON matches(run_id, rank ASC);
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS matches;")
    op.execute("DROP TABLE IF EXISTS match_runs;")
