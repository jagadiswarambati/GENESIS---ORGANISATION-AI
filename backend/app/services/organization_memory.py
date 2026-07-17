from hashlib import sha256

from app.schemas.artifact import MissionArtifact
from app.schemas.execution import WorkerExecution
from app.schemas.memory import MemoryEntry, OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker


class OrganizationMemoryService:
    """Create append-only organization knowledge from completed task executions."""

    def record_completed_execution(
        self,
        memory: OrganizationMemory,
        execution: WorkerExecution,
        task: Task,
        worker: AIWorker,
        provider_name: str,
    ) -> OrganizationMemory:
        """Add one completed execution output without changing its source task or workflow."""

        if execution.status != "completed":
            return memory

        memory_id = self._memory_id(execution)
        entry = MemoryEntry(
            memory_id=memory_id,
            task_id=task.task_id,
            worker_id=worker.worker_id,
            department=task.department,
            title=task.task_name,
            summary=execution.output_summary,
            content=f"Task: {task.description}\nOutput: {execution.output_summary}",
            timestamp=execution.end_time,
            tags=[task.department.lower().replace(" ", "-"), "execution", provider_name],
        )
        return memory.model_copy(update={"entries": [*memory.entries, entry]})

    def record_artifact_reference(
        self,
        memory: OrganizationMemory,
        artifact: MissionArtifact,
    ) -> OrganizationMemory:
        """Add an artifact reference while retaining the existing memory contract."""

        memory_id = f"memory-{artifact.artifact_id}"
        if any(entry.memory_id == memory_id for entry in memory.entries):
            return memory

        entry = MemoryEntry(
            memory_id=memory_id,
            task_id=artifact.task_id,
            worker_id=artifact.worker_id,
            department=artifact.department,
            title=f"Artifact: {artifact.artifact_name}",
            summary=artifact.description,
            content=f"Artifact ID: {artifact.artifact_id}\nType: {artifact.artifact_type}",
            timestamp=artifact.generated_at,
            tags=["artifact", artifact.status, artifact.department.lower().replace(" ", "-")],
        )
        return memory.model_copy(update={"entries": [*memory.entries, entry]})

    @staticmethod
    def _memory_id(execution: WorkerExecution) -> str:
        source = f"{execution.task_id}:{execution.worker_id}:{execution.end_time.isoformat()}"
        return f"memory-{sha256(source.encode()).hexdigest()[:12]}"
