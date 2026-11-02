"""Who may see and set an agent's avatar: whoever may see and edit the agent."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.permissions import AuthContext, Perm
from app.services.agent_registry import AgentRegistryService
from plugins.fluffy_avatars import repository
from plugins.fluffy_avatars.schemas import AvatarStyle


class FluffyAvatarService:
    """Styles, behind the platform's own access check on the agent they belong to.

    Access is the agent registry's `get`, never a second reading of grants: a
    plugin that re-derived visibility would drift from the platform the first
    time the platform's rules changed.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.agents = AgentRegistryService(db)

    async def lookup(self, ctx: AuthContext, agent_ids: list[UUID]) -> dict[UUID, AvatarStyle]:
        """The styles of the agents among `agent_ids` the caller may see.

        An agent the caller may not see is left out exactly as one without a
        style is, so the answer says nothing about which ids exist.
        """
        rows = await repository.list_for(
            self.db, organization_id=ctx.organization_id, agent_ids=list(dict.fromkeys(agent_ids))
        )
        styles: dict[UUID, AvatarStyle] = {}
        for row in rows:
            try:
                await self.agents.get(ctx, row.agent_id)
            except NotFoundError:
                continue
            styles[row.agent_id] = AvatarStyle.model_validate(row.style)
        return styles

    async def set_style(self, ctx: AuthContext, agent_id: UUID, style: AvatarStyle) -> AvatarStyle:
        agent = await self.agents.get(ctx, agent_id, perm=Perm.AGENTS_EDIT)
        row = await repository.upsert(
            self.db,
            agent_id=agent.id,
            organization_id=agent.organization_id,
            style=style.model_dump(mode="json"),
        )
        return AvatarStyle.model_validate(row.style)

    async def reset(self, ctx: AuthContext, agent_id: UUID) -> None:
        """Forget the style, so the agent wears its derived face again."""
        agent = await self.agents.get(ctx, agent_id, perm=Perm.AGENTS_EDIT)
        await repository.delete_for(self.db, agent_id=agent.id)
