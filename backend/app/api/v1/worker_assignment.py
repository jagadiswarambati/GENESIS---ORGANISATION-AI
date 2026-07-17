from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.task_generator import TaskGroup
from app.schemas.worker_assignment import WorkerAssignmentResult
from app.services.worker_assignment import WorkerAssignmentService

router = APIRouter()


def get_worker_assignment_service() -> WorkerAssignmentService:
    return WorkerAssignmentService()


@router.post("/worker-assignments", response_model=WorkerAssignmentResult)
async def create_worker_assignments(
    task_groups: list[TaskGroup],
    service: Annotated[WorkerAssignmentService, Depends(get_worker_assignment_service)],
) -> WorkerAssignmentResult:
    """Assign waiting workers to deterministic tasks without executing organization work."""

    return service.create_assignments(task_groups)
