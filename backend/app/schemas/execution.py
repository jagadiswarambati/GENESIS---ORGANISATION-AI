from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import TaskGroup
from app.schemas.worker_assignment import WorkerAssignmentResult
from app.schemas.workflow import Workflow

ExecutionStatus = Literal["running", "completed", "failed"]
ArtifactContent = Annotated[str, Field(min_length=1, max_length=20_000)]


class ExecutionLog(Schema):
    timestamp: datetime
    message: ShortText


class WorkerExecution(Schema):
    """One provider execution record for a task assigned to an AI worker."""

    worker_id: ShortText
    task_id: ShortText
    start_time: datetime
    end_time: datetime
    execution_duration_ms: Annotated[int, Field(ge=0)]
    status: ExecutionStatus
    output_summary: LongText
    artifact_content: ArtifactContent | None = None
    execution_logs: Annotated[list[ExecutionLog], Field(min_length=1, max_length=8)]


class ExecutionResult(Schema):
    """The provider result and refreshed workflow after one execution batch."""

    provider_name: ShortText
    executions: Annotated[list[WorkerExecution], Field(max_length=64)]
    workflow: Workflow
    organization_memory: OrganizationMemory


class ProviderHealth(Schema):
    """Provider configuration and reachability status for execution surfaces."""

    provider_id: ShortText
    provider_name: ShortText
    is_healthy: bool
    error: ShortText | None = None


class ExecutionRequest(Schema):
    """Existing Genesis state required to execute only tasks that are Ready."""

    workflow: Workflow
    task_groups: Annotated[list[TaskGroup], Field(min_length=1, max_length=8)]
    worker_assignment_result: WorkerAssignmentResult
    organization_memory: OrganizationMemory = Field(
        default_factory=lambda: OrganizationMemory(entries=[])
    )
