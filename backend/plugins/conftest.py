"""Fixtures every plugin's tests share. Plugins' tests do not see `tests/conftest.py`."""

import pytest


@pytest.fixture
def anyio_backend() -> str:
    """The event loop uvicorn runs, as the platform's own suite pins it."""
    return "asyncio"
