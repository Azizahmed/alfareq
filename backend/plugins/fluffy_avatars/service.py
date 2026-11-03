"""Who may see and set an agent's avatar: whoever may see and edit the agent."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.permissions import AuthContext, Perm
from app.db.models.agent import Agent, AgentStatus
from app.db.models.agent_run import RunStatus
from app.services.agent_registry import AgentRegistryService
from plugins.fluffy_avatars import repository
from plugins.fluffy_avatars.schemas import AvatarState, AvatarStyle


def avatar_state(agent_status: str, last_run: str | None) -> AvatarState:
    """What the avatar shows, from what the agent is and how its last run ended.

    Asleep wins: an agent nobody can run has nothing waiting and nothing to fail.
    A run parked for a person is the one thing somebody can act on, so it shows
    over a failure that came before it.
    """
    if agent_status != AgentStatus.PUBLISHED:
        return "asleep"
    if last_run in (RunStatus.AWAITING_APPROVAL, RunStatus.AWAITING_ANSWER):
        return "notification"
    if last_run == RunStatus.FAILED:
        return "failed"
    return "idle"


class FluffyAvatarService:
    """Styles, behind the platform's own access check on the agent they belong to.

    Access is the agent registry's `get`, never a second reading of grants: a
    plugin that re-derived visibility would drift from the platform the first
    time the platform's rules changed.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.agents = AgentRegistryService(db)

    async def lookup(
        self, ctx: AuthContext, agent_ids: list[UUID]
    ) -> tuple[dict[UUID, AvatarStyle], dict[UUID, AvatarState]]:
        """The styles and states of the agents among `agent_ids` the caller may see.

        An agent the caller may not see is left out of both, exactly as one that
        does not exist is, so the answer says nothing about which ids exist.
        """
        wanted = list(dict.fromkeys(agent_ids))
        visible: dict[UUID, Agent] = {}
        for agent_id in wanted:
            try:
                visible[agent_id] = await self.agents.get(ctx, agent_id)
            except NotFoundError:
                continue
        if not visible:
            return {}, {}
        ids = list(visible)
        rows = await repository.list_for(
            self.db, organization_id=ctx.organization_id, agent_ids=ids
        )
        runs = await repository.latest_run_statuses(
            self.db, organization_id=ctx.organization_id, agent_ids=ids
        )
        styles = {row.agent_id: AvatarStyle.model_validate(row.style) for row in rows}
        states = {
            agent_id: avatar_state(agent.status, runs.get(agent_id))
            for agent_id, agent in visible.items()
        }
        return styles, states

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
