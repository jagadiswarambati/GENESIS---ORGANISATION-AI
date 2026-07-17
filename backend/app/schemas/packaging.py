from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema
from app.schemas.workspace import ProjectWorkspace

PackageBuildStatus = Literal["pending", "ready", "failed"]
ArchiveContent = Annotated[str, Field(min_length=1, max_length=8_000_000)]


class RepositoryStatistics(Schema):
    """Repository facts calculated from the completed project workspace."""

    total_files: Annotated[int, Field(ge=0)]
    total_folders: Annotated[int, Field(ge=1)]
    total_size: Annotated[int, Field(ge=0)]


class PackageManifestContext(Schema):
    """Read-only mission context used to describe a workspace export."""

    mission_summary: LongText
    organization_summary: LongText
    departments: Annotated[list[ShortText], Field(max_length=8)]
    generated_workers: Annotated[list[ShortText], Field(max_length=32)]
    total_tasks: Annotated[int, Field(ge=0, le=64)]
    completed_tasks: Annotated[int, Field(ge=0, le=64)]
    generated_artifacts: Annotated[int, Field(ge=0, le=256)]


class PackageManifest(Schema):
    """Human- and machine-readable summary embedded in every export bundle."""

    project_name: ShortText
    mission_summary: LongText
    organization_summary: LongText
    departments: Annotated[list[ShortText], Field(max_length=8)]
    generated_workers: Annotated[list[ShortText], Field(max_length=32)]
    total_tasks: Annotated[int, Field(ge=0, le=64)]
    completed_tasks: Annotated[int, Field(ge=0, le=64)]
    generated_artifacts: Annotated[int, Field(ge=0, le=256)]
    repository_statistics: RepositoryStatistics
    package_timestamp: datetime


class ProjectPackage(Schema):
    """Metadata for a ZIP package produced from one immutable workspace revision."""

    package_id: ShortText
    project_name: ShortText
    package_version: ShortText
    created_at: datetime
    total_files: Annotated[int, Field(ge=0)]
    total_size: Annotated[int, Field(ge=0)]
    build_status: PackageBuildStatus
    source_workspace_id: ShortText
    source_workspace_updated_at: datetime


class ExportBundle(Schema):
    """The archive payload together with its typed package metadata and manifest."""

    archive_base64: ArchiveContent
    archive_file_name: ShortText
    included_files: Annotated[list[ShortText], Field(max_length=300)]
    manifest: PackageManifest
    project_package: ProjectPackage


class ProjectPackagingRequest(Schema):
    """An existing workspace plus read-only context needed for its export manifest."""

    workspace: ProjectWorkspace
    manifest_context: PackageManifestContext
