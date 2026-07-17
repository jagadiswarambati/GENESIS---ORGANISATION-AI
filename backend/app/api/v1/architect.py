from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.schemas.architect import ArchitectRequest, OrganizationBlueprint
from app.schemas.errors import ApiError
from app.services.organization_architect import OrganizationArchitectService
from app.services.providers.factory import ProviderFactory

router = APIRouter()


def get_organization_architect_service() -> OrganizationArchitectService:
    return OrganizationArchitectService(ProviderFactory.create_responses_client(settings))


@router.post(
    "/architect",
    response_model=OrganizationBlueprint,
    responses={
        422: {"model": ApiError},
        429: {"model": ApiError},
        502: {"model": ApiError},
        503: {"model": ApiError},
        504: {"model": ApiError},
    },
)
async def create_organization_blueprint(
    request: ArchitectRequest,
    service: Annotated[OrganizationArchitectService, Depends(get_organization_architect_service)],
) -> OrganizationBlueprint:
    """Create one validated organization blueprint for a mission."""

    return await service.create_blueprint(request.mission)
