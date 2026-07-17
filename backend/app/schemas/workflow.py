from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import ShortText
from app.schemas.base import Schema

WorkflowTaskStatus = Literal["pending", "ready", "running", "completed", "failed", "blocked"]


class WorkflowTaskState(Schema):
    """Execution-state metadata for a task without changing the task itself."""

    task_id: ShortText
    status: WorkflowTaskStatus
    dependencies: Annotated[list[ShortText], Field(max_length=12)]
    blocked_by: Annotated[list[ShortText], Field(max_length=12)]


class Workflow(Schema):
    """A dependency-aware coordination layer for generated task groups."""

    workflow_id: ShortText
    task_states: Annotated[list[WorkflowTaskState], Field(min_length=1, max_length=64)]
