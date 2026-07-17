from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import ShortText
from app.schemas.base import Schema


class AIWorker(Schema):
    """A deterministic organization worker that is available but not executing work."""

    worker_id: ShortText
    worker_name: ShortText
    role: ShortText
    department: ShortText
    current_status: Literal["waiting"] = "waiting"
    assigned_tasks: Annotated[list[ShortText], Field(max_length=64)]
    capabilities: Annotated[list[ShortText], Field(min_length=1, max_length=8)]
    avatar_icon: ShortText | None = None


class WorkerAssignment(Schema):
    """A stable task-to-worker mapping with no execution semantics."""

    task_id: ShortText
    worker_id: ShortText


class WorkerAssignmentResult(Schema):
    """The complete worker roster and its deterministic task assignments."""

    workers: Annotated[list[AIWorker], Field(min_length=1, max_length=32)]
    assignments: Annotated[list[WorkerAssignment], Field(min_length=1, max_length=64)]
