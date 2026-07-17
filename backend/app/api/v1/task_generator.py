from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.execution_plan import ExecutionPlan
from app.schemas.task_generator import TaskGroup
from app.services.task_generator import TaskGeneratorService

router = APIRouter()


def get_task_generator_service() -> TaskGeneratorService:
    return TaskGeneratorService()


@router.post("/task-groups", response_model=list[TaskGroup])
async def create_task_groups(
    execution_plan: ExecutionPlan,
    service: Annotated[TaskGeneratorService, Depends(get_task_generator_service)],
) -> list[TaskGroup]:
    """Create deterministic task groups without assigning or executing organization work."""

    return service.create_task_groups(execution_plan)
