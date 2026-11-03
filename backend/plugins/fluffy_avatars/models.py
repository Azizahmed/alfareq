"""The plugin's one table, on a `MetaData` of its own.

Not the platform's `Base`: a table on it would join the platform's autogenerate,
and `make db-check` would ask for a platform migration to create it.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, MetaData
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

metadata = MetaData()


class PluginBase(DeclarativeBase):
    """Declarative base for this plugin's tables only."""

    metadata = metadata


class AgentAvatarStyle(PluginBase):
    """How one agent's avatar is drawn: the studio's choices, as `AvatarStyle` holds them.

    The foreign key to `agents` lives in the migration rather than here: this
    metadata does not hold `agents`, and the cascade is the database's job - an
    agent deleted by any path takes its style with it.
    """

    __tablename__ = "plugin_fluffy_avatars"

    agent_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), index=True)
    style: Mapped[dict[str, Any]] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    def __repr__(self) -> str:
        return f"<AgentAvatarStyle(agent_id={self.agent_id})>"
