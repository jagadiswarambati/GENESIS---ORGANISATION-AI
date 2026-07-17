from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.artifact import ArtifactCollection
from app.schemas.base import Schema
from app.schemas.memory import OrganizationMemory
from app.schemas.packaging import ProjectPackage
from app.schemas.validation import ValidationReport, ValidationSeverity
from app.schemas.verification import VerificationReport
from app.schemas.workspace import ProjectWorkspace

ReviewCategory = Literal[
    "code_quality",
    "documentation",
    "project_structure",
    "api_design",
    "folder_organization",
    "docker_configuration",
    "test_coverage",
    "readme_quality",
]
ReviewSuggestionStatus = Literal["pending", "resolved"]
RefinementStatus = Literal["prepared", "applied"]


class ReviewSuggestionDraft(Schema):
    """Provider-produced suggestion before Genesis assigns durable review metadata."""

    category: ReviewCategory
    severity: ValidationSeverity
    related_file: ShortText | None = None
    description: LongText
    suggested_improvement: LongText


class ReviewSuggestion(ReviewSuggestionDraft):
    """One actionable, file-level recommendation from a project review."""

    suggestion_id: ShortText
    timestamp: datetime
    status: ReviewSuggestionStatus = "pending"


class ProjectReviewDraft(Schema):
    """Typed assessment produced by a provider before it is attached to a workspace revision."""

    overall_score: Annotated[int, Field(ge=0, le=100)]
    suggestions: Annotated[list[ReviewSuggestionDraft], Field(max_length=12)]
    strengths: Annotated[list[LongText], Field(max_length=8)]
    weaknesses: Annotated[list[LongText], Field(max_length=8)]
    improvement_opportunities: Annotated[list[LongText], Field(max_length=8)]


class ProjectReview(ProjectReviewDraft):
    """A durable review of one generated workspace and its existing quality signals."""

    review_id: ShortText
    created_at: datetime
    suggestions: Annotated[list[ReviewSuggestion], Field(max_length=12)]
    source_workspace_id: ShortText
    source_workspace_updated_at: datetime
    source_package_id: ShortText | None = None
    reviewer_name: ShortText


class RefinementRequest(Schema):
    """A selective request that updates only the artifacts linked to chosen suggestions."""

    refinement_request_id: ShortText
    review_id: ShortText
    selected_suggestion_ids: Annotated[list[ShortText], Field(min_length=1, max_length=12)]
    affected_artifact_ids: Annotated[list[ShortText], Field(max_length=12)]
    created_at: datetime
    status: RefinementStatus
    summary: LongText


class ProjectReviewRequest(Schema):
    """Existing project data inspected by a provider-neutral review service."""

    workspace: ProjectWorkspace
    artifact_collection: ArtifactCollection
    organization_memory: OrganizationMemory
    validation_report: ValidationReport | None = None
    verification_report: VerificationReport | None = None
    project_package: ProjectPackage | None = None
    package_included_files: Annotated[
        list[ShortText], Field(default_factory=list, max_length=300)
    ]


class ProjectRefinementRequest(Schema):
    """Selected suggestions and read-only project context required for targeted refinement."""

    project_review: ProjectReview
    selected_suggestion_ids: Annotated[list[ShortText], Field(min_length=1, max_length=12)]
    workspace: ProjectWorkspace
    artifact_collection: ArtifactCollection
    organization_memory: OrganizationMemory


class ProjectRefinementResult(Schema):
    """Updated review status and only the artifacts affected by a refinement request."""

    project_review: ProjectReview
    refinement_request: RefinementRequest
    artifact_collection: ArtifactCollection
    organization_memory: OrganizationMemory
