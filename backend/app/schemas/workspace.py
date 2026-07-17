from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import ShortText
from app.schemas.artifact import ArtifactCollection, ArtifactContent
from app.schemas.base import Schema
from app.schemas.memory import OrganizationMemory

WorkspaceBuildStatus = Literal["pending", "ready", "failed"]


class WorkspaceFile(Schema):
    """One generated repository file backed by a source mission artifact."""

    file_name: ShortText
    file_path: ShortText
    department: ShortText
    source_artifact_id: ShortText
    file_content: ArtifactContent
    version: Annotated[int, Field(ge=1)]
    generated_at: datetime


class WorkspaceFolder(Schema):
    """A recursive repository folder and its generated children."""

    folder_name: ShortText
    folder_path: ShortText
    child_files: Annotated[list[WorkspaceFile], Field(max_length=256)]
    child_folders: Annotated[list[WorkspaceFolder], Field(max_length=64)]


class ProjectWorkspace(Schema):
    """A structured repository assembled from completed mission artifacts."""

    workspace_id: ShortText
    project_name: ShortText
    created_at: datetime
    last_updated: datetime
    total_files: Annotated[int, Field(ge=0)]
    total_folders: Annotated[int, Field(ge=1)]
    build_status: WorkspaceBuildStatus
    root_folder: WorkspaceFolder


class WorkspaceGenerationRequest(Schema):
    """Completed artifacts and existing memory required to assemble a project workspace."""

    project_name: ShortText
    artifact_collection: ArtifactCollection
    organization_memory: OrganizationMemory
    existing_workspace: ProjectWorkspace | None = None


class WorkspaceGenerationResult(Schema):
    """The generated repository and its durable organization-memory reference."""

    workspace: ProjectWorkspace
    organization_memory: OrganizationMemory
