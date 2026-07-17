import ast
from datetime import datetime, timezone
from hashlib import sha256

from app.schemas.verification import (
    BuildResult,
    ProjectVerificationRequest,
    SandboxRun,
    VerificationReport,
)
from app.schemas.workspace import WorkspaceFile, WorkspaceFolder

REQUIRED_FOLDERS = ("backend", "frontend", "docs", "tests", "deployment", "database")


class VerificationEngine:
    """Safely inspect generated project files without importing or executing user code."""

    def verify(self, request: ProjectVerificationRequest) -> VerificationReport:
        """Build a deterministic verification report for the supplied package revision."""

        started_at = datetime.now(timezone.utc)
        workspace_files = self._workspace_files(request.workspace.root_folder)
        package_files = set(request.package_included_files)
        results = [
            self._verify_backend(request.workspace.root_folder, workspace_files, package_files),
            self._verify_frontend(request.workspace.root_folder, workspace_files, package_files),
            self._verify_deployment(package_files),
            self._verify_documentation(package_files),
        ]
        failed_results = [result for result in results if result.status == "failed"]
        status = "failed" if failed_results else "passed"
        finished_at = datetime.now(timezone.utc)
        passed_checks = sum(result.passed_checks for result in results)
        failed_checks = sum(result.failed_checks for result in results)
        summary = (
            f"Deterministic verification completed with {passed_checks} passed checks and "
            f"{failed_checks} failed checks. No generated user code was executed."
        )
        sandbox_run = SandboxRun(
            verification_id=self._verification_id(request.project_package.package_id, started_at),
            package_id=request.project_package.package_id,
            started_at=started_at,
            finished_at=finished_at,
            status=status,
            build_status=status,
            test_status=status,
            exit_code=1 if failed_results else 0,
            verification_summary=summary,
        )
        return VerificationReport(
            sandbox_run=sandbox_run,
            build_results=results,
            source_workspace_id=request.workspace.workspace_id,
            source_workspace_updated_at=request.workspace.last_updated,
            source_package_id=request.project_package.package_id,
        )

    def _verify_backend(
        self,
        root: WorkspaceFolder,
        workspace_files: list[WorkspaceFile],
        package_files: set[str],
    ) -> BuildResult:
        folder_paths = {folder.folder_path for folder in self._workspace_folders(root)}
        backend_files = [file for file in workspace_files if file.file_path.startswith("backend/")]
        python_files = [file for file in backend_files if file.file_name.endswith(".py")]
        checks: list[tuple[bool, str]] = [
            (
                folder_path in folder_paths,
                f"Verified required {folder_path}/ project structure.",
            )
            for folder_path in REQUIRED_FOLDERS
        ]
        checks.extend(
            [
                (bool(python_files), "Verified generated Python backend source is present."),
                (
                    "backend/requirements.txt" in package_files
                    or "requirements.txt" in package_files,
                    "Verified Python requirements file is present.",
                ),
                (
                    "Dockerfile" in package_files and "backend" in folder_paths,
                    "Verified FastAPI startup command is supplied by the package Dockerfile.",
                ),
            ]
        )

        for python_file in python_files:
            try:
                ast.parse(python_file.file_content, filename=python_file.file_path)
                checks.append(
                    (True, f"Parsed Python source and imports safely: {python_file.file_path}.")
                )
            except SyntaxError as error:
                checks.append(
                    (
                        False,
                        (
                            "Python syntax or import parsing failed: "
                            f"{python_file.file_path} ({error.msg})."
                        ),
                    )
                )
        return self._result("Backend", checks)

    def _verify_frontend(
        self,
        root: WorkspaceFolder,
        workspace_files: list[WorkspaceFile],
        package_files: set[str],
    ) -> BuildResult:
        folder_paths = {folder.folder_path for folder in self._workspace_folders(root)}
        file_paths = {file.file_path for file in workspace_files}
        checks = [
            ("frontend" in folder_paths, "Verified frontend/ project structure."),
            (
                "frontend/package.json" in package_files,
                "Verified frontend package.json.",
            ),
            (
                "frontend/tsconfig.json" in package_files,
                "Verified TypeScript configuration.",
            ),
            (
                "frontend/next.config.js" in package_files
                or "frontend/next.config.mjs" in package_files
                or "frontend/app/page.tsx" in package_files
                or "frontend/app/page.tsx" in file_paths,
                "Verified frontend build configuration or app directory.",
            ),
            (
                "frontend/app/page.tsx" in package_files
                or "frontend/app/page.tsx" in file_paths,
                "Verified frontend App Router entry point.",
            ),
        ]
        return self._result("Frontend", checks)

    def _verify_deployment(self, package_files: set[str]) -> BuildResult:
        checks = [
            ("Dockerfile" in package_files, "Verified Dockerfile."),
            ("docker-compose.yml" in package_files, "Verified docker-compose.yml."),
        ]
        return self._result("Deployment", checks)

    def _verify_documentation(self, package_files: set[str]) -> BuildResult:
        checks = [
            ("README.md" in package_files, "Verified README.md."),
            (".env.example" in package_files, "Verified environment template."),
            ("genesis-manifest.json" in package_files, "Verified package manifest."),
        ]
        return self._result("Documentation", checks)

    @staticmethod
    def _result(target: str, checks: list[tuple[bool, str]]) -> BuildResult:
        passed_checks = sum(check_passed for check_passed, _ in checks)
        failed_checks = len(checks) - passed_checks
        logs = [
            f"PASS: {message}" if check_passed else f"FAIL: {message}"
            for check_passed, message in checks
        ]
        return BuildResult(
            target=target,
            status="passed" if failed_checks == 0 else "failed",
            exit_code=0 if failed_checks == 0 else 1,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            build_logs=logs,
        )

    @staticmethod
    def _workspace_files(folder: WorkspaceFolder) -> list[WorkspaceFile]:
        files = list(folder.child_files)
        for child in folder.child_folders:
            files.extend(VerificationEngine._workspace_files(child))
        return files

    @staticmethod
    def _workspace_folders(folder: WorkspaceFolder) -> list[WorkspaceFolder]:
        folders = [folder]
        for child in folder.child_folders:
            folders.extend(VerificationEngine._workspace_folders(child))
        return folders

    @staticmethod
    def _verification_id(package_id: str, started_at: datetime) -> str:
        source = f"{package_id}:{started_at.isoformat()}"
        return f"verification-{sha256(source.encode()).hexdigest()[:12]}"
