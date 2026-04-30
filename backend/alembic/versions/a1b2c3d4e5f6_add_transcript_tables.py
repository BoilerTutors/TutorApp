"""add transcript submissions table

Revision ID: a1b2c3d4e5f6
Revises: 927a68287367
Create Date: 2026-04-29 20:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
# This migration merges all existing heads and adds the transcript_submissions table
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = ('c8d9e0f1a2b3', 'add_tutor_reports', '6ec3778aedad')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create transcript_submissions table for storing uploaded transcript PDFs."""
    op.create_table(
        'transcript_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default='uploaded'),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('storage_path', sa.String(512), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "status IN ('uploaded', 'processing', 'parsed', 'verified', 'needs_review', 'failed')",
            name='ck_transcript_submission_status'
        ),
    )
    op.create_index(op.f('ix_transcript_submissions_id'), 'transcript_submissions', ['id'], unique=False)
    op.create_index(op.f('ix_transcript_submissions_user_id'), 'transcript_submissions', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop transcript_submissions table."""
    op.drop_index(op.f('ix_transcript_submissions_user_id'), table_name='transcript_submissions')
    op.drop_index(op.f('ix_transcript_submissions_id'), table_name='transcript_submissions')
    op.drop_table('transcript_submissions')
