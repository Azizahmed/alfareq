"""`/api/v1/plugins/fluffy-avatars`: look styles up, set one, reset one."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import Auth
from plugins.fluffy_avatars.deps import FluffyAvatarSvc
from plugins.fluffy_avatars.schemas import (
    AvatarLookupRead,
    AvatarLookupRequest,
    AvatarStyle,
    AvatarStyleRead,
)

router = APIRouter(tags=["plugin: fluffy-avatars"])


@router.post("/agents/lookup", response_model=AvatarLookupRead)
async def lookup_avatar_styles(
    data: AvatarLookupRequest, service: FluffyAvatarSvc, ctx: Auth
) -> Any:
    """The styles of these agents, for those the caller may see and that have one.

    A POST because a page asks about every agent it draws at once, and that many
    ids do not fit a query string.
    """
    return AvatarLookupRead(styles=await service.lookup(ctx, data.agent_ids))


@router.put("/agents/{agent_id}", response_model=AvatarStyleRead)
async def set_avatar_style(
    agent_id: UUID, data: AvatarStyle, service: FluffyAvatarSvc, ctx: Auth
) -> Any:
    """Choose how the agent's avatar is drawn. Takes edit access to the agent."""
    style = await service.set_style(ctx, agent_id, data)
    return AvatarStyleRead(agent_id=agent_id, style=style)


@router.delete(
    "/agents/{agent_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def reset_avatar_style(agent_id: UUID, service: FluffyAvatarSvc, ctx: Auth) -> Any:
    """Forget the agent's style; it wears the face its handle derives again."""
    await service.reset(ctx, agent_id)
