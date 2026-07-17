from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema
from app.schemas.execution import ExecutionResult
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import TaskGroup
from app.schemas.worker_assignment import WorkerAssignmentResult

ArtifactContent = Annotated[str, Field(min_length=1, max_length=20_000)]
ArtifactStatus = Literal["generated", "failed"]


class MissionArtifact(Schema):
    """One structured project file generated from a completed worker execution."""

    artifact_id: ShortText
    task_id: ShortText
    worker_id: ShortText
    department: ShortText
    artifact_name: ShortText
    artifact_type: ShortText
    description: LongText
    content: ArtifactContent
    generated_at: datetime
    version: Annotated[int, Field(ge=1)]
    status: ArtifactStatus


class ArtifactCollection(Schema):
    """Artifacts generated for a mission, separate from execution and workflow state."""

    artifacts: Annotated[list[MissionArtifact], Field(max_length=256)]


class ArtifactGenerationRequest(Schema):
    """Completed execution data required to materialize project artifacts."""

    execution_result: ExecutionResult
    task_groups: Annotated[list[TaskGroup], Field(min_length=1, max_length=8)]
    worker_assignment_result: WorkerAssignmentResult


class ArtifactGenerationResult(Schema):
    """New artifacts and their durable memory references."""

    artifact_collection: ArtifactCollection
    organization_memory: OrganizationMemory
