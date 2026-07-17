from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.artifact import ArtifactCollection
from app.schemas.base import Schema
from app.schemas.packaging import ProjectPackage
from app.schemas.task_generator import TaskGroup
from app.schemas.worker_assignment import WorkerAssignmentResult
from app.schemas.workflow import Workflow
from app.schemas.workspace import ProjectWorkspace

ValidationSeverity = Literal["warning", "error", "critical"]
ProjectHealthStatus = Literal["excellent", "good", "needs_review"]


class ValidationIssue(Schema):
    """One structural, completeness, or consistency finding for a generated project."""

    issue_id: ShortText
    severity: ValidationSeverity
    category: ShortText
    file: ShortText | None = None
    description: LongText
    suggested_fix: LongText
    timestamp: datetime


class ProjectHealth(Schema):
    """Weighted, explainable health summary derived from the validation findings."""

    score: Annotated[int, Field(ge=0, le=100)]
    status: ProjectHealthStatus
    passed_checks: Annotated[int, Field(ge=0)]
    total_checks: Annotated[int, Field(ge=0)]
    warnings: Annotated[int, Field(ge=0)]
    errors: Annotated[int, Field(ge=0)]
    critical_issues: Annotated[int, Field(ge=0)]


class ValidationReport(Schema):
    """A durable report tied to one workspace and package revision."""

    report_id: ShortText
    created_at: datetime
    health: ProjectHealth
    issues: Annotated[list[ValidationIssue], Field(max_length=600)]
    source_workspace_id: ShortText
    source_workspace_updated_at: datetime
    source_package_id: ShortText


class ProjectValidationRequest(Schema):
    """Existing read-only project outputs required to validate an export candidate."""

    workspace: ProjectWorkspace
    artifact_collection: ArtifactCollection
    task_groups: Annotated[list[TaskGroup], Field(max_length=8)]
    workflow: Workflow | None = None
    worker_assignment_result: WorkerAssignmentResult | None = None
    project_package: ProjectPackage
    package_included_files: Annotated[list[ShortText], Field(max_length=300)]
