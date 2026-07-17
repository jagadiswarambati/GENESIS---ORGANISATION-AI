from datetime import datetime, timezone
from hashlib import sha256
from pathlib import PurePosixPath

from app.schemas.task_generator import Task
from app.schemas.validation import (
    ProjectHealth,
    ProjectValidationRequest,
    ValidationIssue,
    ValidationReport,
)
from app.schemas.workspace import WorkspaceFile, WorkspaceFolder

REQUIRED_FOLDERS = ("backend", "frontend", "docs", "tests", "deployment", "database")
REQUIRED_PACKAGE_FILES = (
    "README.md",
    "Dockerfile",
    "docker-compose.yml",
    ".env.example",
    "genesis-manifest.json",
)
VALID_WORKSPACE_ROOTS = frozenset(
    {"backend", "frontend", "database", "tests", "docs", "deployment", "assets"}
)
SEVERITY_PENALTIES = {"warning": 4, "error": 12, "critical": 25}


class ValidationEngine:
    """Run read-only structural and consistency checks for generated project outputs."""

    def validate(self, request: ProjectValidationRequest) -> ValidationReport:
        """Return one deterministic quality report for the provided workspace package revision."""

        now = datetime.now(timezone.utc)
        issues: list[ValidationIssue] = []
        passed_checks = 0
        workspace_files = self._workspace_files(request.workspace.root_folder)
        folder_paths = {
            folder.folder_path
            for folder in self._workspace_folders(request.workspace.root_folder)
        }
        package_files = set(request.package_included_files)

        passed_checks += self._validate_structure(folder_paths, issues, now)
        passed_checks += self._validate_package_files(package_files, issues, now)
        passed_checks += self._validate_artifacts(request, workspace_files, issues, now)
        passed_checks += self._validate_dependencies(request, issues, now)
        passed_checks += self._validate_workers(request, issues, now)
        passed_checks += self._validate_workspace_files(workspace_files, issues, now)
        passed_checks += self._validate_package_contents(
            workspace_files,
            package_files,
            issues,
            now,
        )

        health = self._health(passed_checks, issues)
        report_id = self._report_id(
            request.workspace.workspace_id,
            request.project_package.package_id,
            now,
        )
        return ValidationReport(
            report_id=report_id,
            created_at=now,
            health=health,
            issues=issues,
            source_workspace_id=request.workspace.workspace_id,
            source_workspace_updated_at=request.workspace.last_updated,
            source_package_id=request.project_package.package_id,
        )

    def _validate_structure(
        self,
        folder_paths: set[str],
        issues: list[ValidationIssue],
        timestamp: datetime,
    ) -> int:
        passed_checks = 0
        for folder in REQUIRED_FOLDERS:
            if folder in folder_paths:
                passed_checks += 1
            else:
                issues.append(
                    self._issue(
                        category="repository_structure",
                        description=f"Required repository folder '{folder}/' is missing.",
                        file=folder,
                        severity="critical",
                        suggested_fix=f"Create the '{folder}/' folder in the project workspace.",
                        timestamp=timestamp,
                    )
                )
        return passed_checks

    def _validate_package_files(
        self,
        package_files: set[str],
        issues: list[ValidationIssue],
        timestamp: datetime,
    ) -> int:
        passed_checks = 0
        for file_path in REQUIRED_PACKAGE_FILES:
            if file_path in package_files:
                passed_checks += 1
            else:
                issues.append(
                    self._issue(
                        category="file_validation",
                        description=f"Required export file '{file_path}' is missing.",
                        file=file_path,
                        severity="critical",
                        suggested_fix=f"Regenerate the package so it includes '{file_path}'.",
                        timestamp=timestamp,
                    )
                )
        return passed_checks

    def _validate_artifacts(
        self,
        request: ProjectValidationRequest,
        workspace_files: list[WorkspaceFile],
        issues: list[ValidationIssue],
        timestamp: datetime,
    ) -> int:
        workspace_artifact_ids = {file.source_artifact_id for file in workspace_files}
        passed_checks = 0
        for artifact in request.artifact_collection.artifacts:
            if artifact.artifact_id in workspace_artifact_ids:
                passed_checks += 1
            else:
                issues.append(
                    self._issue(
                        category="artifact_validation",
                        description=(
                            f"Generated artifact '{artifact.artifact_name}' is not placed in "
                            "the workspace."
                        ),
                        file=artifact.artifact_name,
                        severity="error",
                        suggested_fix=(
                            "Regenerate the project workspace from the current artifacts."
                        ),
                        timestamp=timestamp,
                    )
                )
        return passed_checks

    def _validate_dependencies(
        self,
        request: ProjectValidationRequest,
        issues: list[ValidationIssue],
        timestamp: datetime,
    ) -> int:
        if request.workflow is None:
            issues.append(
                self._issue(
                    category="dependency_validation",
                    description="Task dependency states are unavailable for validation.",
                    file=None,
                    severity="warning",
                    suggested_fix="Initialize the workflow before packaging the project.",
                    timestamp=timestamp,
                )
            )
            return 0

        tasks = [task for group in request.task_groups for task in group.tasks]
        tasks_by_identifier = self._tasks_by_identifier(tasks)
        states = {state.task_id: state.status for state in request.workflow.task_states}
        passed_checks = 0
        for task in tasks:
            if states.get(task.task_id) != "completed":
                continue
            unresolved_dependencies = [
                dependency
                for dependency in task.dependencies
                if states.get(tasks_by_identifier.get(dependency, dependency)) != "completed"
            ]
            if unresolved_dependencies:
                issues.append(
                    self._issue(
                        category="dependency_validation",
                        description=(
                            f"Completed task '{task.task_name}' has unresolved dependencies: "
                            f"{self._list_summary(unresolved_dependencies)}."
                        ),
                        file=task.task_name,
                        severity="critical",
                        suggested_fix=(
                            "Complete all task dependencies before marking the task complete."
                        ),
                        timestamp=timestamp,
                    )
                )
            else:
                passed_checks += 1
        return passed_checks

    def _validate_workers(
        self,
        request: ProjectValidationRequest,
        issues: list[ValidationIssue],
        timestamp: datetime,
    ) -> int:
        if request.worker_assignment_result is None or request.workflow is None:
            issues.append(
                self._issue(
                    category="worker_validation",
                    description=(
                        "Worker assignments or workflow states are unavailable for validation."
                    ),
                    file=None,
                    severity="warning",
                    suggested_fix=(
                        "Assign workers and initialize the workflow before packaging the project."
                    ),
                    timestamp=timestamp,
                )
            )
            return 0

        states = {state.task_id: state.status for state in request.workflow.task_states}
        passed_checks = 0
        for worker in request.worker_assignment_result.workers:
            incomplete_tasks = [
                task_id for task_id in worker.assigned_tasks if states.get(task_id) != "completed"
            ]
            if incomplete_tasks:
                issues.append(
                    self._issue(
                        category="worker_validation",
                        description=(
                            f"Worker '{worker.worker_name}' has incomplete assigned tasks: "
                            f"{self._list_summary(incomplete_tasks)}."
                        ),
                        file=None,
                        severity="warning",
                        suggested_fix=(
                            "Complete or reassign the worker's remaining tasks before final export."
                        ),
                        timestamp=timestamp,
                    )
                )
            else:
                passed_checks += 1
        return passed_checks

    def _validate_workspace_files(
        self,
        workspace_files: list[WorkspaceFile],
        issues: list[ValidationIssue],
        timestamp: datetime,
    ) -> int:
        passed_checks = 0
        for workspace_file in workspace_files:
            path = PurePosixPath(workspace_file.file_path)
            root = path.parts[0] if path.parts else ""
            if root in VALID_WORKSPACE_ROOTS and not path.is_absolute() and ".." not in path.parts:
                passed_checks += 1
            else:
                issues.append(
                    self._issue(
                        category="workspace_validation",
                        description=(
                            f"Workspace file '{workspace_file.file_path}' is outside a valid "
                            "repository folder."
                        ),
                        file=workspace_file.file_path,
                        severity="error",
                        suggested_fix=(
                            "Move the file into a supported repository folder and rebuild the "
                            "workspace."
                        ),
                        timestamp=timestamp,
                    )
                )
        return passed_checks

    def _validate_package_contents(
        self,
        workspace_files: list[WorkspaceFile],
        package_files: set[str],
        issues: list[ValidationIssue],
        timestamp: datetime,
    ) -> int:
        passed_checks = 0
        for workspace_file in workspace_files:
            if workspace_file.file_path in package_files:
                passed_checks += 1
            else:
                issues.append(
                    self._issue(
                        category="package_validation",
                        description=(
                            f"Workspace file '{workspace_file.file_path}' is missing from the "
                            "export package."
                        ),
                        file=workspace_file.file_path,
                        severity="error",
                        suggested_fix="Regenerate the project package from the current workspace.",
                        timestamp=timestamp,
                    )
                )
        return passed_checks

    @staticmethod
    def _workspace_files(folder: WorkspaceFolder) -> list[WorkspaceFile]:
        files = list(folder.child_files)
        for child in folder.child_folders:
            files.extend(ValidationEngine._workspace_files(child))
        return files

    @staticmethod
    def _workspace_folders(folder: WorkspaceFolder) -> list[WorkspaceFolder]:
        folders = [folder]
        for child in folder.child_folders:
            folders.extend(ValidationEngine._workspace_folders(child))
        return folders

    @staticmethod
    def _tasks_by_identifier(tasks: list[Task]) -> dict[str, str]:
        return {
            identifier: task.task_id
            for task in tasks
            for identifier in (task.task_id, task.task_name)
        }

    @staticmethod
    def _list_summary(items: list[str]) -> str:
        shown_items = items[:2]
        summary = ", ".join(shown_items)
        return f"{summary} and {len(items) - len(shown_items)} more" if len(items) > 2 else summary

    @staticmethod
    def _health(passed_checks: int, issues: list[ValidationIssue]) -> ProjectHealth:
        warnings = sum(issue.severity == "warning" for issue in issues)
        errors = sum(issue.severity == "error" for issue in issues)
        critical_issues = sum(issue.severity == "critical" for issue in issues)
        penalty = sum(SEVERITY_PENALTIES[issue.severity] for issue in issues)
        score = max(0, 100 - penalty)
        status = "excellent" if score >= 90 else "good" if score >= 70 else "needs_review"
        return ProjectHealth(
            score=score,
            status=status,
            passed_checks=passed_checks,
            total_checks=passed_checks + len(issues),
            warnings=warnings,
            errors=errors,
            critical_issues=critical_issues,
        )

    @staticmethod
    def _issue(
        category: str,
        description: str,
        file: str | None,
        severity: str,
        suggested_fix: str,
        timestamp: datetime,
    ) -> ValidationIssue:
        source = f"{category}:{file or 'project'}:{description}"
        return ValidationIssue(
            issue_id=f"validation-{sha256(source.encode()).hexdigest()[:12]}",
            severity=severity,
            category=category,
            file=file,
            description=description,
            suggested_fix=suggested_fix,
            timestamp=timestamp,
        )

    @staticmethod
    def _report_id(workspace_id: str, package_id: str, timestamp: datetime) -> str:
        source = f"{workspace_id}:{package_id}:{timestamp.isoformat()}"
        return f"report-{sha256(source.encode()).hexdigest()[:12]}"
