from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema
from app.schemas.packaging import ProjectPackage
from app.schemas.workspace import ProjectWorkspace

VerificationStatus = Literal["passed", "failed", "pending"]
ProjectImplementationLevel = Literal["foundation", "partial", "complete"]
VerificationLog = Annotated[str, Field(min_length=1, max_length=1200)]


class SandboxRun(Schema):
    """One safe, deterministic verification run for a packaged project revision."""

    verification_id: ShortText
    package_id: ShortText
    started_at: datetime
    finished_at: datetime
    status: VerificationStatus
    build_status: VerificationStatus
    test_status: VerificationStatus
    implementation_level: ProjectImplementationLevel
    exit_code: Annotated[int, Field(ge=0)]
    verification_summary: LongText


class BuildResult(Schema):
    """One deterministic verification result for a project surface."""

    target: ShortText
    status: VerificationStatus
    exit_code: Annotated[int, Field(ge=0)]
    passed_checks: Annotated[int, Field(ge=0)]
    pending_checks: Annotated[int, Field(ge=0)]
    failed_checks: Annotated[int, Field(ge=0)]
    build_logs: Annotated[list[VerificationLog], Field(min_length=1, max_length=16)]


class VerificationReport(Schema):
    """The aggregate sandbox result, without executing generated user code."""

    sandbox_run: SandboxRun
    build_results: Annotated[list[BuildResult], Field(min_length=1, max_length=8)]
    source_workspace_id: ShortText
    source_workspace_updated_at: datetime
    source_package_id: ShortText


class ProjectVerificationRequest(Schema):
    """Existing workspace and package metadata required for safe deterministic verification."""

    workspace: ProjectWorkspace
    project_package: ProjectPackage
    package_included_files: Annotated[list[ShortText], Field(max_length=300)]
