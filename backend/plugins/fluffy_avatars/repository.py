"""Data access for the style rows."""

from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from plugins.fluffy_avatars.models import AgentAvatarStyle


async def list_for(
    db: AsyncSession, *, organization_id: UUID, agent_ids: list[UUID]
) -> list[AgentAvatarStyle]:
    """The rows for these agents, inside one organization."""
    result = await db.execute(
        select(AgentAvatarStyle).where(
            AgentAvatarStyle.organization_id == organization_id,
            AgentAvatarStyle.agent_id.in_(agent_ids),
        )
    )
    return list(result.scalars().all())


async def upsert(
    db: AsyncSession, *, agent_id: UUID, organization_id: UUID, style: dict[str, Any]
) -> AgentAvatarStyle:
    row = await db.get(AgentAvatarStyle, agent_id)
    if row is None:
        row = AgentAvatarStyle(agent_id=agent_id, organization_id=organization_id, style=style)
        db.add(row)
    else:
        row.style = style
    await db.flush()
    await db.refresh(row)
    return row


async def delete_for(db: AsyncSession, *, agent_id: UUID) -> None:
    await db.execute(delete(AgentAvatarStyle).where(AgentAvatarStyle.agent_id == agent_id))
    await db.flush()
