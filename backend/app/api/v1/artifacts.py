from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.artifact import ArtifactGenerationRequest, ArtifactGenerationResult
from app.services.artifact_generation import ArtifactGenerationService
from app.services.organization_memory import OrganizationMemoryService

router = APIRouter()


def get_artifact_generation_service() -> ArtifactGenerationService:
    return ArtifactGenerationService(OrganizationMemoryService())


@router.post("/artifacts", response_model=ArtifactGenerationResult)
async def generate_artifacts(
    request: ArtifactGenerationRequest,
    service: Annotated[ArtifactGenerationService, Depends(get_artifact_generation_service)],
) -> ArtifactGenerationResult:
    """Create mission artifacts from completed executions without invoking a provider."""

    return service.generate(request)
