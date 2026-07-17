from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.schemas.review import (
    ProjectRefinementRequest,
    ProjectRefinementResult,
    ProjectReview,
    ProjectReviewRequest,
)
from app.services.project_review import ProjectReviewService
from app.services.review_providers.factory import ProjectReviewProviderFactory

router = APIRouter()


def get_project_review_service() -> ProjectReviewService:
    return ProjectReviewService(ProjectReviewProviderFactory.create(settings))


@router.post("/project-reviews", response_model=ProjectReview)
async def create_project_review(
    request: ProjectReviewRequest,
    service: Annotated[ProjectReviewService, Depends(get_project_review_service)],
) -> ProjectReview:
    """Review existing project outputs without changing planning, execution, or packaging."""

    return await service.create_review(request)


@router.post("/project-reviews/refinements", response_model=ProjectRefinementResult)
async def refine_project_artifacts(
    request: ProjectRefinementRequest,
    service: Annotated[ProjectReviewService, Depends(get_project_review_service)],
) -> ProjectRefinementResult:
    """Refine only artifacts linked to selected suggestions."""

    return await service.refine(request)
