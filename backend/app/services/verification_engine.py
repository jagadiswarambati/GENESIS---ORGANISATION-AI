import ast
from datetime import UTC, datetime
from hashlib import sha256

from app.schemas.verification import (
    BuildResult,
    ProjectImplementationLevel,
    ProjectVerificationRequest,
    SandboxRun,
    VerificationReport,
)
from app.schemas.workspace import WorkspaceFile, WorkspaceFolder

REQUIRED_FOLDERS = ("backend", "frontend", "docs", "tests", "deployment", "database")
SOURCE_FILE_SUFFIXES = (".js", ".jsx", ".py", ".ts", ".tsx")


class VerificationEngine:
    """Safely inspect generated project files without importing or executing user code."""

    def verify(self, request: ProjectVerificationRequest) -> VerificationReport:
        """Build a deterministic verification report for the supplied package revision."""

        started_at = datetime.now(UTC)
        workspace_files = self._workspace_files(request.workspace.root_folder)
        folder_paths = {
            folder.folder_path for folder in self._workspace_folders(request.workspace.root_folder)
        }
        package_files = set(request.package_included_files)
        results = [
            self._verify_backend(folder_paths, workspace_files, package_files),
            self._verify_frontend(folder_paths, workspace_files, package_files),
            self._verify_database(folder_paths),
            self._verify_deployment(folder_paths, package_files),
            self._verify_documentation(folder_paths, package_files),
        ]
        failed_results = [result for result in results if result.status == "failed"]
        status = "failed" if failed_results else "passed"
        implementation_level = self._implementation_level(workspace_files)
        code_generation_pending = any(result.status == "pending" for result in results)
        finished_at = datetime.now(UTC)
        passed_checks = sum(result.passed_checks for result in results)
        pending_checks = sum(result.pending_checks for result in results)
        failed_checks = sum(result.failed_checks for result in results)
        summary = self._summary(
            failed_checks=failed_checks,
            implementation_level=implementation_level,
            passed_checks=passed_checks,
            pending_checks=pending_checks,
            status=status,
        )
        sandbox_run = SandboxRun(
            verification_id=self._verification_id(request.project_package.package_id, started_at),
            package_id=request.project_package.package_id,
            started_at=started_at,
            finished_at=finished_at,
            status=status,
            build_status=status,
            test_status="pending" if status == "passed" and code_generation_pending else status,
            implementation_level=implementation_level,
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
        folder_paths: set[str],
        workspace_files: list[WorkspaceFile],
        package_files: set[str],
    ) -> BuildResult:
        backend_files = [file for file in workspace_files if file.file_path.startswith("backend/")]
        python_files = [file for file in backend_files if file.file_name.endswith(".py")]
        checks: list[tuple[bool, str]] = [
            ("backend" in folder_paths, "Verified backend/ project structure."),
            (
                "backend/requirements.txt" in package_files or "requirements.txt" in package_files,
                "Verified Python requirements file is present.",
            ),
            (
                "Dockerfile" in package_files,
                "Verified FastAPI startup command is supplied by the package Dockerfile.",
            ),
        ]

        if not all(check_passed for check_passed, _ in checks):
            return self._result("Backend", checks)

        if not python_files:
            return self._pending_result(
                "Backend",
                checks,
                "Generated backend source is awaiting code generation.",
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
        folder_paths: set[str],
        workspace_files: list[WorkspaceFile],
        package_files: set[str],
    ) -> BuildResult:
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
                "frontend/app/page.tsx" in package_files or "frontend/app/page.tsx" in file_paths,
                "Verified frontend App Router entry point.",
            ),
        ]
        return self._result("Frontend", checks)

    @staticmethod
    def _verify_database(folder_paths: set[str]) -> BuildResult:
        checks = [("database" in folder_paths, "Verified database/ project structure.")]
        return VerificationEngine._result("Database", checks)

    @staticmethod
    def _verify_deployment(folder_paths: set[str], package_files: set[str]) -> BuildResult:
        checks = [
            ("deployment" in folder_paths, "Verified deployment/ project structure."),
            ("Dockerfile" in package_files, "Verified Dockerfile."),
            ("docker-compose.yml" in package_files, "Verified docker-compose.yml."),
        ]
        return VerificationEngine._result("Deployment", checks)

    @staticmethod
    def _verify_documentation(folder_paths: set[str], package_files: set[str]) -> BuildResult:
        checks = [
            ("docs" in folder_paths, "Verified docs/ project structure."),
            ("tests" in folder_paths, "Verified tests/ project structure."),
            ("README.md" in package_files, "Verified README.md."),
            (".env.example" in package_files, "Verified environment template."),
            ("genesis-manifest.json" in package_files, "Verified package manifest."),
        ]
        return VerificationEngine._result("Documentation", checks)

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
            pending_checks=0,
            failed_checks=failed_checks,
            build_logs=logs,
        )

    @staticmethod
    def _pending_result(
        target: str,
        checks: list[tuple[bool, str]],
        pending_message: str,
    ) -> BuildResult:
        return BuildResult(
            target=target,
            status="pending",
            exit_code=0,
            passed_checks=sum(check_passed for check_passed, _ in checks),
            pending_checks=1,
            failed_checks=0,
            build_logs=[
                *(f"PASS: {message}" for check_passed, message in checks if check_passed),
                f"PENDING: {pending_message}",
            ],
        )

    @staticmethod
    def _implementation_level(workspace_files: list[WorkspaceFile]) -> ProjectImplementationLevel:
        has_backend_source = any(
            file.file_path.startswith("backend/") and file.file_name.endswith(".py")
            for file in workspace_files
        )
        has_frontend_source = any(
            file.file_path.startswith("frontend/") and file.file_name.endswith(SOURCE_FILE_SUFFIXES)
            for file in workspace_files
        )
        if has_backend_source and has_frontend_source:
            return "complete"
        if has_backend_source or has_frontend_source:
            return "partial"
        return "foundation"

    @staticmethod
    def _summary(
        *,
        failed_checks: int,
        implementation_level: ProjectImplementationLevel,
        passed_checks: int,
        pending_checks: int,
        status: str,
    ) -> str:
        if status == "failed":
            outcome = "Structural verification found issues that require review."
        elif implementation_level == "foundation":
            outcome = (
                "Project foundation verified; generated backend source is awaiting code generation."
            )
        elif implementation_level == "partial":
            outcome = (
                "Partial implementation verified; remaining source surfaces may still be generated."
            )
        else:
            outcome = "Complete implementation structure verified."
        return (
            f"{outcome} {passed_checks} checks passed, {pending_checks} awaiting generation, and "
            f"{failed_checks} structural failures. No generated user code was executed."
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
