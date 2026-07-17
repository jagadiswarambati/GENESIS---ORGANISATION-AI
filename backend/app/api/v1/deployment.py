from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.deployment import DeploymentGenerationRequest, DeploymentPlan
from app.services.deployment_generation import DeploymentGenerationService

router = APIRouter()


def get_deployment_generation_service() -> DeploymentGenerationService:
    return DeploymentGenerationService()


@router.post("/deployments", response_model=DeploymentPlan)
async def generate_deployment_plan(
    request: DeploymentGenerationRequest,
    service: Annotated[DeploymentGenerationService, Depends(get_deployment_generation_service)],
) -> DeploymentPlan:
    """Generate an additive deployment overlay from an existing package revision."""

    return service.generate(request)
