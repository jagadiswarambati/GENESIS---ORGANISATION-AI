from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import PurePosixPath

from app.schemas.artifact import MissionArtifact
from app.schemas.memory import MemoryEntry, OrganizationMemory
from app.schemas.workspace import (
    ProjectWorkspace,
    WorkspaceFile,
    WorkspaceFolder,
    WorkspaceGenerationRequest,
    WorkspaceGenerationResult,
)

BASE_FOLDERS = (
    "backend/services",
    "frontend/app",
    "frontend/components",
    "frontend/lib",
    "database/migrations",
    "tests",
    "docs/marketing",
    "deployment",
    "assets",
)
SHORT_TEXT_MAX_LENGTH = 240
WORKSPACE_MEMORY_TITLE_PREFIX = "Project workspace: "


@dataclass
class FolderNode:
    """Mutable construction node converted to a typed immutable WorkspaceFolder at the boundary."""

    name: str
    path: str
    files: list[WorkspaceFile] = field(default_factory=list)
    folders: dict[str, FolderNode] = field(default_factory=dict)


class WorkspaceEngine:
    """Organize existing mission artifacts into a deterministic, provider-neutral repository."""

    def generate(self, request: WorkspaceGenerationRequest) -> WorkspaceGenerationResult:
        """Assemble a workspace without modifying artifact creation or execution behavior."""

        now = datetime.now(UTC)
        workspace_id = self._workspace_id(request.project_name)
        root = FolderNode(name=self._project_directory_name(request.project_name), path="/")
        for folder_path in BASE_FOLDERS:
            self._ensure_folder(root, folder_path)

        files = self._workspace_files(request.artifact_collection.artifacts)
        for workspace_file in files:
            folder_path = str(PurePosixPath(workspace_file.file_path).parent)
            folder = self._ensure_folder(root, "" if folder_path == "." else folder_path)
            folder.files.append(workspace_file)

        workspace = ProjectWorkspace(
            workspace_id=workspace_id,
            project_name=request.project_name,
            created_at=request.existing_workspace.created_at if request.existing_workspace else now,
            last_updated=now,
            total_files=len(files),
            total_folders=self._folder_count(root),
            build_status="ready" if files else "pending",
            root_folder=self._to_workspace_folder(root),
        )
        return WorkspaceGenerationResult(
            workspace=workspace,
            organization_memory=self._record_workspace_reference(
                request.organization_memory,
                workspace,
            ),
        )

    def _workspace_files(self, artifacts: list[MissionArtifact]) -> list[WorkspaceFile]:
        used_paths: set[str] = set()
        files: list[WorkspaceFile] = []
        for artifact in sorted(artifacts, key=lambda item: (item.generated_at, item.artifact_id)):
            directory = self._directory_for(artifact)
            file_name = self._unique_file_name(artifact, directory, used_paths)
            file_path = f"{directory}/{file_name}"
            used_paths.add(file_path)
            files.append(
                WorkspaceFile(
                    file_name=file_name,
                    file_path=file_path,
                    department=artifact.department,
                    source_artifact_id=artifact.artifact_id,
                    file_content=artifact.content,
                    version=artifact.version,
                    generated_at=artifact.generated_at,
                )
            )
        return files

    @staticmethod
    def _directory_for(artifact: MissionArtifact) -> str:
        department = artifact.department.lower()
        artifact_type = artifact.artifact_type.lower()
        artifact_name = artifact.artifact_name.lower()
        if artifact_name == "deployment-summary.md":
            return "deployment"
        if artifact_name in {"readme.md", "project-structure.md", "worker-summary.md"}:
            return "docs"
        if "marketing" in department:
            return "docs/marketing"
        if "research" in department or "strategy" in department:
            return "docs"
        if "database" in department or "schema" in artifact_type:
            return "database"
        if "backend" in department:
            return "backend"
        if "frontend" in department:
            return "frontend"
        if "design" in department:
            return "frontend/components"
        if "qa" in department or "quality" in department:
            return "tests"
        if "operation" in department or "devops" in department:
            return "deployment"
        return "docs"

    @staticmethod
    def _unique_file_name(
        artifact: MissionArtifact,
        directory: str,
        used_paths: set[str],
    ) -> str:
        max_file_name_length = SHORT_TEXT_MAX_LENGTH - len(directory) - 1
        candidate = re.sub(
            r"[^a-zA-Z0-9._-]+",
            "-",
            PurePosixPath(artifact.artifact_name).name,
        )
        candidate = WorkspaceEngine._trim_file_name(candidate.strip("."), max_file_name_length)
        path = f"{directory}/{candidate}"
        if path not in used_paths:
            return candidate

        artifact_path = PurePosixPath(candidate)
        collision_suffix = f"-{artifact.artifact_id[-6:]}{artifact_path.suffix}"
        max_stem_length = max(1, max_file_name_length - len(collision_suffix))
        return f"{artifact_path.stem[:max_stem_length]}{collision_suffix}"

    @staticmethod
    def _trim_file_name(candidate: str, max_length: int) -> str:
        safe_candidate = candidate or "generated-artifact.txt"
        candidate_path = PurePosixPath(safe_candidate)
        suffix = candidate_path.suffix
        max_stem_length = max(1, max_length - len(suffix))
        return f"{candidate_path.stem[:max_stem_length]}{suffix}"

    @staticmethod
    def _ensure_folder(root: FolderNode, folder_path: str) -> FolderNode:
        current = root
        for part in PurePosixPath(folder_path).parts:
            if part in {"", ".", "/"}:
                continue
            current_path = part if current.path == "/" else f"{current.path}/{part}"
            current = current.folders.setdefault(part, FolderNode(name=part, path=current_path))
        return current

    @staticmethod
    def _to_workspace_folder(node: FolderNode) -> WorkspaceFolder:
        return WorkspaceFolder(
            folder_name=node.name,
            folder_path=node.path,
            child_files=sorted(node.files, key=lambda item: item.file_name),
            child_folders=[
                WorkspaceEngine._to_workspace_folder(child)
                for _, child in sorted(node.folders.items())
            ],
        )

    @staticmethod
    def _folder_count(node: FolderNode) -> int:
        return 1 + sum(WorkspaceEngine._folder_count(child) for child in node.folders.values())

    @staticmethod
    def _workspace_id(project_name: str) -> str:
        return f"workspace-{sha256(project_name.lower().encode()).hexdigest()[:12]}"

    @staticmethod
    def _project_directory_name(project_name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", project_name.lower()).strip("-")
        return slug or "genesis-project"

    @staticmethod
    def _record_workspace_reference(
        memory: OrganizationMemory,
        workspace: ProjectWorkspace,
    ) -> OrganizationMemory:
        memory_id = f"memory-{workspace.workspace_id}-{workspace.total_files}"
        if (
            any(entry.memory_id == memory_id for entry in memory.entries)
            or len(memory.entries) >= 256
        ):
            return memory

        max_title_suffix_length = SHORT_TEXT_MAX_LENGTH - len(WORKSPACE_MEMORY_TITLE_PREFIX)
        title_suffix = workspace.project_name[:max_title_suffix_length]
        entry = MemoryEntry(
            memory_id=memory_id,
            task_id="workspace-generation",
            worker_id="workspace-engine",
            department="Operations",
            title=f"{WORKSPACE_MEMORY_TITLE_PREFIX}{title_suffix}",
            summary=(
                f"Repository assembled with {workspace.total_files} files and "
                f"{workspace.total_folders} folders."
            ),
            content=(
                f"Workspace ID: {workspace.workspace_id}\n"
                f"Build status: {workspace.build_status}\n"
                f"Root folder: {workspace.root_folder.folder_name}"
            ),
            timestamp=workspace.last_updated,
            tags=["workspace", "repository", workspace.build_status],
        )
        return memory.model_copy(update={"entries": [*memory.entries, entry]})
