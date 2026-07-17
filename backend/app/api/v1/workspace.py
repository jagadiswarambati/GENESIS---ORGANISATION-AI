from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.workspace import WorkspaceGenerationRequest, WorkspaceGenerationResult
from app.services.workspace_engine import WorkspaceEngine

router = APIRouter()


def get_workspace_engine() -> WorkspaceEngine:
    return WorkspaceEngine()


@router.post("/workspaces", response_model=WorkspaceGenerationResult)
async def generate_workspace(
    request: WorkspaceGenerationRequest,
    engine: Annotated[WorkspaceEngine, Depends(get_workspace_engine)],
) -> WorkspaceGenerationResult:
    """Assemble a repository from completed artifacts without generating new artifacts."""

    return engine.generate(request)
