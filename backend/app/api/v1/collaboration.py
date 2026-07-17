from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.schemas.collaboration import CollaborativeExecutionRequest, CollaborativeExecutionResult
from app.services.collaboration_engine import CollaborationEngine
from app.services.collaborative_execution import CollaborativeExecutionService

router = APIRouter()


def get_collaborative_execution_service() -> CollaborativeExecutionService:
    return CollaborativeExecutionService(settings, CollaborationEngine())


@router.post("/collaborative-executions", response_model=CollaborativeExecutionResult)
async def execute_collaboratively(
    request: CollaborativeExecutionRequest,
    service: Annotated[
        CollaborativeExecutionService,
        Depends(get_collaborative_execution_service),
    ],
) -> CollaborativeExecutionResult:
    """Coordinate worker communication, then execute Ready tasks through the existing engine."""

    return await service.execute_ready_tasks(request)
