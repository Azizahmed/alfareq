"""Create the avatar style table.

Revision ID: fluffy_avatars_0001
Revises:
Create Date: 2026-11-02

The first revision of this plugin's own history (`alembic_version_fluffy_avatars`),
so it has no parent: the platform's tables already exist when it runs, because
`agenticos db upgrade` runs the platform's chain first.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "fluffy_avatars_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "plugin_fluffy_avatars",
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("style", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("agent_id"),
    )
    op.create_index(
        "ix_plugin_fluffy_avatars_organization_id", "plugin_fluffy_avatars", ["organization_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_plugin_fluffy_avatars_organization_id", table_name="plugin_fluffy_avatars")
    op.drop_table("plugin_fluffy_avatars")
