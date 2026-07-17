from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.schemas.system_health import SystemHealth
from app.services.system_health import SystemHealthService

router = APIRouter()


def get_system_health_service() -> SystemHealthService:
    return SystemHealthService(settings)


@router.get("/system-health", response_model=SystemHealth)
async def get_system_health(
    service: Annotated[SystemHealthService, Depends(get_system_health_service)],
) -> SystemHealth:
    """Report runtime prerequisites and configured AI connectivity without exposing secrets."""

    return await service.get_health()
