"""The deployment's built-in name is Alfareq; an administrator's choice still wins."""

from unittest.mock import AsyncMock

import pytest

from app.core.plugins import default_app_name
from app.repositories import deployment_settings_repo
from app.services.deployment_settings import DeploymentSettingsService

pytestmark = pytest.mark.anyio


def test_the_built_in_name_is_alfareq() -> None:
    assert default_app_name() == "Alfareq"


async def test_mail_names_alfareq_when_nobody_renamed_the_deployment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(deployment_settings_repo, "get", AsyncMock(return_value=None))

    assert await DeploymentSettingsService(AsyncMock()).effective_app_name() == "Alfareq"


async def test_an_administrators_name_overrides_the_brand(monkeypatch: pytest.MonkeyPatch) -> None:
    row = type("Row", (), {"app_name": "Acme AI"})()
    monkeypatch.setattr(deployment_settings_repo, "get", AsyncMock(return_value=row))

    assert await DeploymentSettingsService(AsyncMock()).effective_app_name() == "Acme AI"
