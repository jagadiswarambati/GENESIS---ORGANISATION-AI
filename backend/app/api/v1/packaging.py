import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.packaging import ExportBundle, ProjectPackagingRequest
from app.services.packaging_engine import PackagingEngine

router = APIRouter()
logger = logging.getLogger(__name__)


def get_packaging_engine() -> PackagingEngine:
    return PackagingEngine()


@router.post("/packages", response_model=ExportBundle)
async def create_project_package(
    request: ProjectPackagingRequest,
    engine: Annotated[PackagingEngine, Depends(get_packaging_engine)],
) -> ExportBundle:
    """Package an existing workspace without changing its generation or execution state."""

    try:
        return engine.package(request)
    except Exception as error:
        logger.exception(
            "Project packaging failed: exception_type=%s exception_message=%s workspace_id=%s",
            type(error).__name__,
            str(error),
            request.workspace.workspace_id,
        )
        raise
