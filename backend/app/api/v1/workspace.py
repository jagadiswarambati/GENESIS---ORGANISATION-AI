import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.workspace import WorkspaceGenerationRequest, WorkspaceGenerationResult
from app.services.workspace_engine import WorkspaceEngine

router = APIRouter()
logger = logging.getLogger(__name__)


def get_workspace_engine() -> WorkspaceEngine:
    return WorkspaceEngine()


@router.post("/workspaces", response_model=WorkspaceGenerationResult)
async def generate_workspace(
    request: WorkspaceGenerationRequest,
    engine: Annotated[WorkspaceEngine, Depends(get_workspace_engine)],
) -> WorkspaceGenerationResult:
    """Assemble a repository from completed artifacts without generating new artifacts."""

    try:
        return engine.generate(request)
    except Exception as error:
        logger.exception(
            "Workspace generation failed: exception_type=%s exception_message=%s artifact_count=%s",
            type(error).__name__,
            str(error),
            len(request.artifact_collection.artifacts),
        )
        raise
