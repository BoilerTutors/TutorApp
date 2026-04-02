"""add admin_messages table

Revision ID: 8b7c6d5e4f3a
Revises: 7a1d2c3e4f5a, add_tutor_reports, c8d9e0f1a2b3
Create Date: 2026-04-02 16:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8b7c6d5e4f3a"
down_revision: Union[str, Sequence[str], None] = (
    "7a1d2c3e4f5a",
    "add_tutor_reports",
    "c8d9e0f1a2b3",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tutor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("refund_requested", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_admin_messages_id", "admin_messages", ["id"], unique=False)
    op.create_index("ix_admin_messages_student_id", "admin_messages", ["student_id"], unique=False)
    op.create_index("ix_admin_messages_tutor_id", "admin_messages", ["tutor_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_admin_messages_tutor_id", table_name="admin_messages")
    op.drop_index("ix_admin_messages_student_id", table_name="admin_messages")
    op.drop_index("ix_admin_messages_id", table_name="admin_messages")
    op.drop_table("admin_messages")
