from hashlib import sha256

from app.schemas.artifact import (
    ArtifactCollection,
    ArtifactGenerationRequest,
    ArtifactGenerationResult,
    MissionArtifact,
)
from app.schemas.execution import WorkerExecution
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.artifact_catalog import artifact_name_for, artifact_profile_for
from app.services.organization_memory import OrganizationMemoryService


class ArtifactGenerationService:
    """Materialize project artifacts from completed provider executions only."""

    def __init__(self, memory_service: OrganizationMemoryService) -> None:
        self._memory_service = memory_service

    def generate(self, request: ArtifactGenerationRequest) -> ArtifactGenerationResult:
        """Create artifacts without executing, planning, assigning, or changing workflow state."""

        tasks_by_id = {
            task.task_id: task for group in request.task_groups for task in group.tasks
        }
        workers_by_id = {
            worker.worker_id: worker for worker in request.worker_assignment_result.workers
        }
        memory = request.execution_result.organization_memory
        artifacts: list[MissionArtifact] = []

        for execution in request.execution_result.executions:
            if execution.status != "completed":
                continue

            task = tasks_by_id.get(execution.task_id)
            worker = workers_by_id.get(execution.worker_id)
            if task is None or worker is None:
                continue

            artifact = self._create_artifact(execution, task, worker)
            artifacts.append(artifact)
            memory = self._memory_service.record_artifact_reference(memory, artifact)

        return ArtifactGenerationResult(
            artifact_collection=ArtifactCollection(artifacts=artifacts),
            organization_memory=memory,
        )

    @staticmethod
    def _create_artifact(
        execution: WorkerExecution,
        task: Task,
        worker: AIWorker,
    ) -> MissionArtifact:
        profile = artifact_profile_for(task)
        artifact_id = ArtifactGenerationService._artifact_id(execution)
        content = execution.artifact_content or ArtifactGenerationService._fallback_content(
            task, execution
        )
        return MissionArtifact(
            artifact_id=artifact_id,
            task_id=task.task_id,
            worker_id=worker.worker_id,
            department=task.department,
            artifact_name=artifact_name_for(task, profile),
            artifact_type=profile.artifact_type,
            description=f"{profile.description} Generated from {task.task_name}.",
            content=content,
            generated_at=execution.end_time,
            version=1,
            status="generated",
        )

    @staticmethod
    def _artifact_id(execution: WorkerExecution) -> str:
        source = f"{execution.task_id}:{execution.worker_id}:{execution.end_time.isoformat()}"
        return f"artifact-{sha256(source.encode()).hexdigest()[:12]}"

    @staticmethod
    def _fallback_content(task: Task, execution: WorkerExecution) -> str:
        return f"# {task.task_name}\n\n{execution.output_summary}"
