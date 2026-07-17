import base64
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import PurePosixPath

from app.schemas.packaging import (
    ExportBundle,
    PackageManifest,
    PackageManifestContext,
    ProjectPackage,
    ProjectPackagingRequest,
    RepositoryStatistics,
)
from app.schemas.workspace import ProjectWorkspace, WorkspaceFile, WorkspaceFolder

PACKAGE_VERSION = "1.0.0"
PACKAGE_DIRECTORIES = (
    "backend",
    "frontend",
    "database",
    "deployment",
    "tests",
    "docs",
    "assets",
)


class PackagingEngine:
    """Package an existing workspace into a portable ZIP without changing its source files."""

    def package(self, request: ProjectPackagingRequest) -> ExportBundle:
        """Create a ZIP archive and manifest from the provided workspace revision only."""

        now = datetime.now(timezone.utc)
        workspace_files = self._workspace_files(request.workspace.root_folder)
        manifest = self._manifest(
            request.workspace,
            request.manifest_context,
            workspace_files,
            now,
        )
        root_directory = self._project_directory_name(request.workspace.project_name)
        archive_files = self._archive_files(workspace_files, manifest)
        archive = self._zip_archive(root_directory, archive_files)
        package = ProjectPackage(
            package_id=self._package_id(request.workspace.workspace_id, now),
            project_name=request.workspace.project_name,
            package_version=PACKAGE_VERSION,
            created_at=now,
            total_files=len(archive_files),
            total_size=len(archive),
            build_status="ready",
            source_workspace_id=request.workspace.workspace_id,
            source_workspace_updated_at=request.workspace.last_updated,
        )
        archive_file_name = f"{root_directory[:236] or 'genesis-project'}.zip"

        return ExportBundle(
            archive_base64=base64.b64encode(archive).decode("ascii"),
            archive_file_name=archive_file_name,
            included_files=sorted(archive_files),
            manifest=manifest,
            project_package=package,
        )

    @staticmethod
    def _workspace_files(folder: WorkspaceFolder) -> list[WorkspaceFile]:
        files = list(folder.child_files)
        for child in folder.child_folders:
            files.extend(PackagingEngine._workspace_files(child))
        return files

    @staticmethod
    def _manifest(
        workspace: ProjectWorkspace,
        context: PackageManifestContext,
        workspace_files: list[WorkspaceFile],
        timestamp: datetime,
    ) -> PackageManifest:
        repository_size = sum(len(file.file_content.encode("utf-8")) for file in workspace_files)
        return PackageManifest(
            project_name=workspace.project_name,
            mission_summary=context.mission_summary,
            organization_summary=context.organization_summary,
            departments=context.departments,
            generated_workers=context.generated_workers,
            total_tasks=context.total_tasks,
            completed_tasks=context.completed_tasks,
            generated_artifacts=context.generated_artifacts,
            repository_statistics=RepositoryStatistics(
                total_files=workspace.total_files,
                total_folders=workspace.total_folders,
                total_size=repository_size,
            ),
            package_timestamp=timestamp,
        )

    def _archive_files(
        self,
        workspace_files: list[WorkspaceFile],
        manifest: PackageManifest,
    ) -> dict[str, bytes]:
        archive_files: dict[str, bytes] = {}
        for workspace_file in workspace_files:
            relative_path = self._safe_relative_path(workspace_file.file_path)
            archive_files[relative_path] = workspace_file.file_content.encode("utf-8")

        archive_files.update(
            {
                ".env.example": b"# Add generated project environment variables here.\n",
                "Dockerfile": self._dockerfile_content().encode("utf-8"),
                "README.md": self._readme_content(manifest).encode("utf-8"),
                "docker-compose.yml": self._docker_compose_content().encode("utf-8"),
                "genesis-manifest.json": json.dumps(
                    manifest.model_dump(mode="json"),
                    indent=2,
                    sort_keys=True,
                ).encode("utf-8"),
            }
        )
        self._add_runtime_scaffold(archive_files)
        return archive_files

    @staticmethod
    def _add_runtime_scaffold(archive_files: dict[str, bytes]) -> None:
        """Supply minimal runtime files only when generated artifacts did not provide them."""

        archive_files.setdefault(
            "backend/app.py",
            (
                "from fastapi import FastAPI\n\n"
                "app = FastAPI()\n\n"
                "@app.get('/health')\n"
                "async def health_check() -> dict[str, str]:\n"
                "    return {'status': 'ok'}\n"
            ).encode("utf-8"),
        )
        archive_files.setdefault(
            "backend/requirements.txt",
            b"fastapi>=0.115,<1.0\nuvicorn[standard]>=0.32,<1.0\n",
        )
        archive_files.setdefault(
            "frontend/package.json",
            (
                "{\n"
                "  \"private\": true,\n"
                "  \"scripts\": { \"build\": \"next build\", \"start\": \"next start\" },\n"
                "  \"dependencies\": { \"next\": \"^15.0.0\", \"react\": \"^19.0.0\", "
                "\"react-dom\": \"^19.0.0\" }\n"
                "}\n"
            ).encode("utf-8"),
        )
        archive_files.setdefault(
            "frontend/tsconfig.json",
            (
                "{\n"
                "  \"compilerOptions\": { \"jsx\": \"preserve\", \"strict\": true },\n"
                "  \"include\": [\"**/*.ts\", \"**/*.tsx\"]\n"
                "}\n"
            ).encode("utf-8"),
        )
        archive_files.setdefault(
            "frontend/next.config.mjs",
            b"/** @type {import('next').NextConfig} */\nexport default {};\n",
        )
        archive_files.setdefault(
            "frontend/app/layout.tsx",
            (
                "import type { Metadata } from 'next';\n"
                "import type { ReactNode } from 'react';\n\n"
                "export const metadata: Metadata = { title: 'Generated Genesis Project' };\n\n"
                "export default function RootLayout({ children }: { children: ReactNode }) {\n"
                "  return <html lang=\"en\"><body>{children}</body></html>;\n"
                "}\n"
            ).encode("utf-8"),
        )
        archive_files.setdefault(
            "frontend/app/page.tsx",
            (
                "export default function HomePage() {\n"
                "  return <main>Generated by Genesis.</main>;\n"
                "}\n"
            ).encode("utf-8"),
        )

    @staticmethod
    def _zip_archive(root_directory: str, archive_files: dict[str, bytes]) -> bytes:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for directory in PACKAGE_DIRECTORIES:
                archive.writestr(f"{root_directory}/{directory}/", b"")
            for relative_path, content in sorted(archive_files.items()):
                archive.writestr(f"{root_directory}/{relative_path}", content)
        return buffer.getvalue()

    @staticmethod
    def _safe_relative_path(file_path: str) -> str:
        path = PurePosixPath(file_path)
        if path.is_absolute() or any(part in {"", ".", "..", "/"} for part in path.parts):
            raise ValueError("Workspace contains an unsafe export path.")
        return str(path)

    @staticmethod
    def _readme_content(manifest: PackageManifest) -> str:
        departments = ", ".join(manifest.departments) or "No departments generated"
        return (
            f"# {manifest.project_name}\n\n"
            "This repository was packaged by Genesis.\n\n"
            f"## Mission\n\n{manifest.mission_summary}\n\n"
            f"## Organization\n\n{manifest.organization_summary}\n\n"
            f"## Departments\n\n{departments}\n"
        )

    @staticmethod
    def _dockerfile_content() -> str:
        return (
            "FROM python:3.12-slim\n"
            "WORKDIR /app\n"
            "COPY backend /app/backend\n"
            "CMD [\"python\", \"-m\", \"uvicorn\", \"backend.app:app\", \"--host\", \"0.0.0.0\"]\n"
        )

    @staticmethod
    def _docker_compose_content() -> str:
        return (
            "services:\n"
            "  app:\n"
            "    build: .\n"
            "    env_file: .env\n"
            "    ports:\n"
            "      - \"8000:8000\"\n"
        )

    @staticmethod
    def _project_directory_name(project_name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", project_name.lower()).strip("-")
        return slug or "genesis-project"

    @staticmethod
    def _package_id(workspace_id: str, timestamp: datetime) -> str:
        source = f"{workspace_id}:{timestamp.isoformat()}"
        return f"package-{sha256(source.encode()).hexdigest()[:12]}"
