from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.task_generator import TaskGroup
from app.schemas.workflow import Workflow
from app.services.workflow_engine import WorkflowEngineService

router = APIRouter()


def get_workflow_engine_service() -> WorkflowEngineService:
    return WorkflowEngineService()


@router.post("/workflows", response_model=Workflow)
async def create_workflow(
    task_groups: list[TaskGroup],
    service: Annotated[WorkflowEngineService, Depends(get_workflow_engine_service)],
) -> Workflow:
    """Create a dependency-aware workflow without assigning or executing work."""

    return service.create_workflow(task_groups)


@router.post("/workflows/refresh", response_model=Workflow)
async def refresh_workflow(
    workflow: Workflow,
    service: Annotated[WorkflowEngineService, Depends(get_workflow_engine_service)],
) -> Workflow:
    """Refresh dependency-driven readiness after a task state changes elsewhere."""

    return service.refresh_workflow(workflow)
