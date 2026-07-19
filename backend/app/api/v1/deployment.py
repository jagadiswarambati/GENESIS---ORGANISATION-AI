import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.deployment import DeploymentGenerationRequest, DeploymentPlan
from app.services.deployment_generation import DeploymentGenerationService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_deployment_generation_service() -> DeploymentGenerationService:
    return DeploymentGenerationService()


@router.post("/deployments", response_model=DeploymentPlan)
async def generate_deployment_plan(
    request: DeploymentGenerationRequest,
    service: Annotated[DeploymentGenerationService, Depends(get_deployment_generation_service)],
) -> DeploymentPlan:
    """Generate an additive deployment overlay from an existing package revision."""

    try:
        return service.generate(request)
    except Exception as error:
        logger.exception(
            "Deployment generation failed: exception_type=%s exception_message=%s package_id=%s",
            type(error).__name__,
            str(error),
            request.project_package.package_id,
        )
        raise
