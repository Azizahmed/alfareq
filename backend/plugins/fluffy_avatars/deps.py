"""Dependency aliases for the plugin's routes, as `app/api/deps.py` declares the platform's."""

from typing import Annotated

from fastapi import Depends

from app.api.deps import DBSession
from plugins.fluffy_avatars.service import FluffyAvatarService


def get_fluffy_avatar_service(db: DBSession) -> FluffyAvatarService:
    return FluffyAvatarService(db)


FluffyAvatarSvc = Annotated[FluffyAvatarService, Depends(get_fluffy_avatar_service)]
