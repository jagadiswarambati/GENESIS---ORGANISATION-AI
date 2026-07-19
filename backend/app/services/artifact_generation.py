from hashlib import sha256

from app.schemas.artifact import (
    ArtifactCollection,
    ArtifactGenerationRequest,
    ArtifactGenerationResult,
    MissionArtifact,
)
from app.schemas.execution import ExecutionResult, WorkerExecution
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.organization_memory import OrganizationMemoryService

ESSENTIAL_ARTIFACTS = (
    ("readme", "README.md", "README (.md)", "A concise project foundation overview."),
    (
        "project-structure",
        "project-structure.md",
        "Project Structure (.md)",
        "The approved repository structure and department handoffs.",
    ),
    (
        "worker-summary",
        "worker-summary.md",
        "Worker Summary (.md)",
        "The specialist roster and assigned task summary.",
    ),
    (
        "deployment-summary",
        "deployment-summary.md",
        "Deployment Summary (.md)",
        "The runtime and deployment readiness summary.",
    ),
)


class ArtifactGenerationService:
    """Materialize project artifacts from completed provider executions only."""

    def __init__(self, memory_service: OrganizationMemoryService) -> None:
        self._memory_service = memory_service

    def generate(self, request: ArtifactGenerationRequest) -> ArtifactGenerationResult:
        """Create the cached project-foundation artifacts without invoking a provider."""

        tasks_by_id = {task.task_id: task for group in request.task_groups for task in group.tasks}
        workers_by_id = {
            worker.worker_id: worker for worker in request.worker_assignment_result.workers
        }
        memory = request.execution_result.organization_memory
        primary_task_id = self._primary_task_id(request)
        primary_execution = next(
            (
                execution
                for execution in request.execution_result.executions
                if execution.status == "completed" and execution.task_id == primary_task_id
            ),
            None,
        )
        if primary_execution is None:
            return ArtifactGenerationResult(
                artifact_collection=ArtifactCollection(artifacts=[]),
                organization_memory=memory,
            )

        task = tasks_by_id.get(primary_execution.task_id)
        worker = workers_by_id.get(primary_execution.worker_id)
        if task is None or worker is None:
            return ArtifactGenerationResult(
                artifact_collection=ArtifactCollection(artifacts=[]),
                organization_memory=memory,
            )

        artifacts = [
            self._create_essential_artifact(
                key, name, artifact_type, description, request, task, worker
            )
            for key, name, artifact_type, description in ESSENTIAL_ARTIFACTS
        ]
        for artifact in artifacts:
            memory = self._memory_service.record_artifact_reference(memory, artifact)

        return ArtifactGenerationResult(
            artifact_collection=ArtifactCollection(artifacts=artifacts),
            organization_memory=memory,
        )

    def _create_essential_artifact(
        self,
        key: str,
        name: str,
        artifact_type: str,
        description: str,
        request: ArtifactGenerationRequest,
        task: Task,
        worker: AIWorker,
    ) -> MissionArtifact:
        execution = self._primary_execution(request.execution_result, task.task_id)
        assert execution is not None
        return MissionArtifact(
            artifact_id=self._artifact_id(task, key),
            task_id=task.task_id,
            worker_id=worker.worker_id,
            department=task.department,
            artifact_name=name,
            artifact_type=artifact_type,
            description=description,
            content=self._essential_content(key, request, task, worker, execution),
            generated_at=execution.end_time,
            version=1,
            status="generated",
        )

    @staticmethod
    def _primary_task_id(request: ArtifactGenerationRequest) -> str | None:
        ordered_groups = sorted(request.task_groups, key=lambda group: group.phase_id)
        for group in ordered_groups:
            if group.tasks:
                return group.tasks[0].task_id
        return None

    @staticmethod
    def _primary_execution(
        execution_result: ExecutionResult,
        task_id: str,
    ) -> WorkerExecution | None:
        return next(
            (
                execution
                for execution in execution_result.executions
                if execution.status == "completed" and execution.task_id == task_id
            ),
            None,
        )

    @staticmethod
    def _artifact_id(task: Task, key: str) -> str:
        source = f"project-foundation:{task.task_id}:{key}"
        return f"artifact-{sha256(source.encode()).hexdigest()[:12]}"

    @staticmethod
    def _essential_content(
        key: str,
        request: ArtifactGenerationRequest,
        task: Task,
        worker: AIWorker,
        execution: WorkerExecution,
    ) -> str:
        departments = [group.department for group in request.task_groups]
        worker_lines = [
            f"- {item.worker_name} — {item.role} ({item.department}): "
            f"{len(item.assigned_tasks)} assigned task(s)"
            for item in request.worker_assignment_result.workers
        ]
        if key == "readme":
            return (
                "# Genesis Project Foundation\n\n"
                "## Current Mission Work\n\n"
                f"{task.task_name} is the first completed task for the approved organization "
                "plan.\n\n"
                "## Worker Outcome\n\n"
                f"{execution.output_summary}\n\n"
                "## Departments\n\n" + "\n".join(f"- {department}" for department in departments)
            )
        if key == "project-structure":
            return (
                "# Project Structure\n\n"
                "```text\n"
                "project/\n"
                "├── backend/\n"
                "├── frontend/\n"
                "├── database/\n"
                "├── deployment/\n"
                "├── tests/\n"
                "├── docs/\n"
                "└── assets/\n"
                "```\n\n"
                "The structure is derived from the approved execution plan and ready for "
                "incremental implementation."
            )
        if key == "worker-summary":
            return "# Worker Summary\n\n" + "\n".join(worker_lines)
        return (
            "# Deployment Summary\n\n"
            "## Runtime\n\n"
            "- Frontend: web application runtime\n"
            "- Backend: API service runtime\n"
            "- Database: PostgreSQL-compatible database\n\n"
            "## Current Handoff\n\n"
            f"{worker.worker_name} completed {task.task_name}. Deployment assets can be "
            "assembled from the approved project structure without generating placeholder files."
        )
