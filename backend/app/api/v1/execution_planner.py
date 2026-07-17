from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.architect import OrganizationBlueprint
from app.schemas.execution_plan import ExecutionPlan
from app.services.execution_planner import ExecutionPlannerService

router = APIRouter()


def get_execution_planner_service() -> ExecutionPlannerService:
    return ExecutionPlannerService()


@router.post("/execution-plans", response_model=ExecutionPlan)
async def create_execution_plan(
    blueprint: OrganizationBlueprint,
    service: Annotated[ExecutionPlannerService, Depends(get_execution_planner_service)],
) -> ExecutionPlan:
    """Create a deterministic department roadmap without executing organization work."""

    return service.create_plan(blueprint)
