"""The avatar studio's backend: what a style may be, and who may see or set one.

Access is the agent registry's, so these tests stand in for `AgentRegistryService.get`
and hold the service to what it does with the answer: an agent the caller may not
see is left out of a lookup exactly like one without a style, and setting or
resetting a style asks for edit access.
"""

import uuid
from collections.abc import AsyncGenerator, Callable
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.api.deps import get_auth_context, get_db_session
from app.core.exceptions import NotFoundError
from app.core.permissions import AuthContext, Perm
from app.main import app
from plugins.fluffy_avatars import repository
from plugins.fluffy_avatars.deps import get_fluffy_avatar_service
from plugins.fluffy_avatars.models import AgentAvatarStyle
from plugins.fluffy_avatars.schemas import LOOKUP_LIMIT, AvatarStyle
from plugins.fluffy_avatars.service import FluffyAvatarService, avatar_state

pytestmark = pytest.mark.anyio

ORG = uuid.uuid4()


def a_ctx() -> AuthContext:
    return AuthContext(user_id=uuid.uuid4(), organization_id=ORG, role="member")


def an_agent(agent_id: uuid.UUID, status: str = "published") -> SimpleNamespace:
    return SimpleNamespace(id=agent_id, organization_id=ORG, status=status)


def a_row(agent_id: uuid.UUID, style: dict[str, Any]) -> AgentAvatarStyle:
    return AgentAvatarStyle(agent_id=agent_id, organization_id=ORG, style=style)


class TestTheStyle:
    def test_a_character_wears_its_own_colour(self) -> None:
        style = AvatarStyle(character="malu", expression="happy")
        assert (style.shape, style.colour) == (None, None)

    def test_a_shape_takes_a_colour(self) -> None:
        assert AvatarStyle(shape="hexagon", colour=5).colour == 5

    @pytest.mark.parametrize(
        "fields",
        [
            {},
            {"character": "malu", "shape": "circle"},
            {"character": "malu", "colour": 3},
            {"shape": "circle", "colour": 12},
            {"shape": "star"},
            {"character": "malu", "expression": "smug"},
        ],
    )
    def test_a_style_that_does_not_say_one_thing_is_refused(self, fields: dict[str, Any]) -> None:
        with pytest.raises(ValidationError):
            AvatarStyle.model_validate(fields)


class TestTheState:
    @pytest.mark.parametrize(
        ("agent_status", "last_run", "state"),
        [
            ("draft", "failed", "asleep"),
            ("archived", None, "asleep"),
            ("published", "awaiting_approval", "notification"),
            ("published", "awaiting_answer", "notification"),
            ("published", "failed", "failed"),
            ("published", "completed", "idle"),
            ("published", "budget_exceeded", "idle"),
            ("published", None, "idle"),
        ],
    )
    def test_the_avatar_follows_the_agent(
        self, agent_status: str, last_run: str | None, state: str
    ) -> None:
        assert avatar_state(agent_status, last_run) == state


class TestTheService:
    @pytest.fixture
    def service(self) -> FluffyAvatarService:
        service = FluffyAvatarService(AsyncMock())
        service.agents = AsyncMock()
        return service

    async def test_a_lookup_answers_only_agents_the_caller_may_see(
        self, service: FluffyAvatarService, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        visible, hidden = uuid.uuid4(), uuid.uuid4()
        listed = AsyncMock(
            return_value=[a_row(visible, {"character": "fred", "expression": "own"})]
        )
        runs = AsyncMock(return_value={visible: "failed"})
        monkeypatch.setattr(repository, "list_for", listed)
        monkeypatch.setattr(repository, "latest_run_statuses", runs)

        async def get(ctx: AuthContext, agent_id: uuid.UUID, **_: object) -> SimpleNamespace:
            if agent_id == hidden:
                raise NotFoundError(message="Agent not found", details={"agent_id": agent_id})
            return an_agent(agent_id)

        service.agents.get = get

        styles, states = await service.lookup(a_ctx(), [visible, hidden, visible])

        assert list(styles) == [visible]
        assert styles[visible].character == "fred"
        assert states == {visible: "failed"}
        # Neither query is asked about an agent the caller may not see.
        assert listed.await_args.kwargs == {"organization_id": ORG, "agent_ids": [visible]}
        assert runs.await_args.kwargs == {"organization_id": ORG, "agent_ids": [visible]}

    async def test_a_lookup_of_nothing_visible_reads_nothing(
        self, service: FluffyAvatarService, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        listed = AsyncMock()
        monkeypatch.setattr(repository, "list_for", listed)
        service.agents.get = AsyncMock(side_effect=NotFoundError(message="Agent not found"))

        assert await service.lookup(a_ctx(), [uuid.uuid4()]) == ({}, {})
        assert listed.await_count == 0

    async def test_setting_a_style_needs_edit_access_and_stores_it(
        self, service: FluffyAvatarService, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        agent_id = uuid.uuid4()
        service.agents.get = AsyncMock(return_value=an_agent(agent_id))
        stored: dict[str, Any] = {}

        async def upsert(db: object, **kwargs: Any) -> AgentAvatarStyle:
            stored.update(kwargs)
            return a_row(kwargs["agent_id"], kwargs["style"])

        monkeypatch.setattr(repository, "upsert", upsert)

        style = await service.set_style(a_ctx(), agent_id, AvatarStyle(shape="diamond", colour=7))

        assert service.agents.get.await_args.kwargs == {"perm": Perm.AGENTS_EDIT}
        assert stored == {
            "agent_id": agent_id,
            "organization_id": ORG,
            "style": {"character": None, "shape": "diamond", "colour": 7, "expression": "own"},
        }
        assert style.shape == "diamond"

    async def test_a_caller_who_may_not_edit_the_agent_stores_nothing(
        self, service: FluffyAvatarService, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        service.agents.get = AsyncMock(side_effect=NotFoundError(message="Agent not found"))
        upsert = AsyncMock()
        deleted = AsyncMock()
        monkeypatch.setattr(repository, "upsert", upsert)
        monkeypatch.setattr(repository, "delete_for", deleted)

        with pytest.raises(NotFoundError):
            await service.set_style(a_ctx(), uuid.uuid4(), AvatarStyle(character="vila"))
        with pytest.raises(NotFoundError):
            await service.reset(a_ctx(), uuid.uuid4())
        assert upsert.await_count == deleted.await_count == 0

    async def test_resetting_forgets_the_style(
        self, service: FluffyAvatarService, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        agent_id = uuid.uuid4()
        service.agents.get = AsyncMock(return_value=an_agent(agent_id))
        deleted = AsyncMock()
        monkeypatch.setattr(repository, "delete_for", deleted)

        await service.reset(a_ctx(), agent_id)

        assert deleted.await_args.kwargs == {"agent_id": agent_id}


class TestTheRepository:
    async def test_upsert_creates_a_row_then_updates_it(self) -> None:
        db = AsyncMock()
        db.add = lambda row: setattr(db, "added", row)
        db.get = AsyncMock(return_value=None)
        agent_id = uuid.uuid4()

        row = await repository.upsert(db, agent_id=agent_id, organization_id=ORG, style={"a": 1})
        assert row is db.added
        assert row.style == {"a": 1}

        db.get = AsyncMock(return_value=row)
        again = await repository.upsert(db, agent_id=agent_id, organization_id=ORG, style={"b": 2})
        assert again is row
        assert row.style == {"b": 2}
        assert "AgentAvatarStyle" in repr(row)

    async def test_list_and_delete_go_through_the_session(self) -> None:
        db = AsyncMock()
        db.execute.return_value.scalars = lambda: SimpleNamespace(all=lambda: ["row"])
        agent_id = uuid.uuid4()
        db.execute.return_value.all = lambda: [SimpleNamespace(agent_id=agent_id, status="failed")]

        assert await repository.latest_run_statuses(
            db, organization_id=ORG, agent_ids=[agent_id]
        ) == {agent_id: "failed"}

        assert await repository.list_for(db, organization_id=ORG, agent_ids=[uuid.uuid4()]) == [
            "row"
        ]
        await repository.delete_for(db, agent_id=uuid.uuid4())
        assert db.flush.await_count == 1


class TestTheRoutes:
    @pytest.fixture
    async def client(self) -> AsyncGenerator[tuple[AsyncClient, AsyncMock]]:
        service = AsyncMock(spec=FluffyAvatarService)
        overrides: dict[Callable[..., Any], Callable[..., Any]] = {
            get_auth_context: a_ctx,
            get_db_session: AsyncMock,
            get_fluffy_avatar_service: lambda: service,
        }
        app.dependency_overrides.update(overrides)
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                yield c, service
        finally:
            for dependency in overrides:
                app.dependency_overrides.pop(dependency, None)

    async def test_a_lookup_answers_a_map_of_styles(
        self, client: tuple[AsyncClient, AsyncMock]
    ) -> None:
        http, service = client
        agent_id = uuid.uuid4()
        service.lookup.return_value = (
            {agent_id: AvatarStyle(character="cloe")},
            {agent_id: "asleep"},
        )

        response = await http.post(
            "/api/v1/plugins/fluffy-avatars/agents/lookup", json={"agent_ids": [str(agent_id)]}
        )

        assert response.status_code == 200
        assert response.json()["styles"][str(agent_id)]["character"] == "cloe"
        assert response.json()["states"] == {str(agent_id): "asleep"}

    async def test_a_lookup_too_large_for_one_page_is_refused(
        self, client: tuple[AsyncClient, AsyncMock]
    ) -> None:
        http, service = client
        ids = [str(uuid.uuid4()) for _ in range(LOOKUP_LIMIT + 1)]

        response = await http.post(
            "/api/v1/plugins/fluffy-avatars/agents/lookup", json={"agent_ids": ids}
        )

        assert response.status_code == 422
        assert service.lookup.await_count == 0

    async def test_setting_and_resetting_a_style(
        self, client: tuple[AsyncClient, AsyncMock]
    ) -> None:
        http, service = client
        agent_id = uuid.uuid4()
        service.set_style.return_value = AvatarStyle(shape="cloud", colour=2, expression="sleepy")

        put = await http.put(
            f"/api/v1/plugins/fluffy-avatars/agents/{agent_id}",
            json={"shape": "cloud", "colour": 2, "expression": "sleepy"},
        )
        deleted = await http.delete(f"/api/v1/plugins/fluffy-avatars/agents/{agent_id}")

        assert put.status_code == 200
        assert put.json() == {
            "agent_id": str(agent_id),
            "style": {"character": None, "shape": "cloud", "colour": 2, "expression": "sleepy"},
        }
        assert deleted.status_code == 204
        assert service.reset.await_args.args[1] == agent_id

    async def test_a_refused_edit_reaches_the_caller_as_not_found(
        self, client: tuple[AsyncClient, AsyncMock]
    ) -> None:
        http, service = client
        service.set_style.side_effect = NotFoundError(message="Agent not found")

        response = await http.put(
            f"/api/v1/plugins/fluffy-avatars/agents/{uuid.uuid4()}", json={"character": "nexo"}
        )

        assert response.status_code == 404

    async def test_the_service_factory_builds_on_the_requests_session(self) -> None:
        db = AsyncMock()
        assert get_fluffy_avatar_service(db).db is db
