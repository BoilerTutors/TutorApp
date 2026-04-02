"""add tutor_reports table

Revision ID: add_tutor_reports
Revises: <REPLACE WITH OUTPUT OF: alembic heads>
Create Date: 2026-04-02
"""
from alembic import op
import sqlalchemy as sa

revision = "add_tutor_reports"
down_revision = "55353b6f275c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tutor_reports",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "reporter_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "tutor_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("tutoring_sessions.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'reviewed', 'resolved', 'dismissed')",
            name="ck_report_status",
        ),
    )


def downgrade() -> None:
    op.drop_table("tutor_reports")