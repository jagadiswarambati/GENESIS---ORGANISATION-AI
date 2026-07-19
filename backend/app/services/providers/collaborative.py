from app.schemas.artifact import ArtifactCollection
from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationSession,
    CollaborationStage,
)
from app.schemas.execution import WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.collaboration_engine import CollaborationEngine
from app.services.providers.base import AIProvider


class CollaborativeAIProvider:
    """Provider decorator that coordinates conversations without changing task execution."""

    def __init__(
        self,
        provider: AIProvider,
        collaboration_engine: CollaborationEngine,
        collaboration_session: CollaborationSession,
        artifact_collection: ArtifactCollection,
        phase_names: dict[int, str],
    ) -> None:
        self._provider = provider
        self._collaboration_engine = collaboration_engine
        self._collaboration_session = collaboration_session
        self._artifact_collection = artifact_collection
        self._phase_names = phase_names

    @property
    def provider_name(self) -> str:
        return self._provider.provider_name

    @property
    def collaboration_session(self) -> CollaborationSession:
        return self._collaboration_session

    async def health_check(self) -> bool:
        return await self._provider.health_check()

    async def create_collaboration_message(
        self,
        task: Task,
        worker: AIWorker,
        collaboration_context: CollaborationContext,
        stage: CollaborationStage,
        execution_summary: str | None = None,
    ) -> CollaborationMessageDraft:
        return await self._provider.create_collaboration_message(
            task,
            worker,
            collaboration_context,
            stage,
            execution_summary,
        )

    async def execute_task(
        self,
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
        collaboration_context: CollaborationContext | None = None,
    ) -> WorkerExecution:
        """Coordinate efficiently, then delegate only the task execution to the wrapped provider."""

        context = collaboration_context or self._context_for(task, organization_memory)
        if self._uses_compact_collaboration:
            execution = await self._provider.execute_task(
                task,
                worker,
                organization_memory,
                collaboration_context=context,
            )
            if execution.status == "completed":
                await self._record_message(
                    task,
                    worker,
                    context,
                    "after_execution",
                    execution.output_summary,
                )
            return execution

        await self._record_message(task, worker, context, "before_execution")
        context = self._context_for(task, organization_memory)
        await self._record_message(task, worker, context, "during_execution")
        context = self._context_for(task, organization_memory)
        execution = await self._provider.execute_task(
            task,
            worker,
            organization_memory,
            collaboration_context=context,
        )
        if execution.status == "completed":
            await self._record_message(
                task,
                worker,
                context,
                "after_execution",
                execution.output_summary,
            )
        return execution

    @property
    def supports_parallel_execution(self) -> bool:
        return bool(getattr(self._provider, "supports_parallel_execution", True))

    @property
    def _uses_compact_collaboration(self) -> bool:
        return bool(getattr(self._provider, "uses_compact_collaboration", False))

    def _context_for(
        self,
        task: Task,
        organization_memory: OrganizationMemory,
    ) -> CollaborationContext:
        return self._collaboration_engine.build_context(
            self._collaboration_session,
            organization_memory,
            self._artifact_collection,
            task,
        )

    async def _record_message(
        self,
        task: Task,
        worker: AIWorker,
        context: CollaborationContext,
        stage: CollaborationStage,
        execution_summary: str | None = None,
    ) -> None:
        draft = await self._provider.create_collaboration_message(
            task,
            worker,
            context,
            stage,
            execution_summary,
        )
        self._collaboration_session = self._collaboration_engine.append_message(
            self._collaboration_session,
            task,
            worker,
            draft,
            self._phase_names.get(task.phase_id, f"Phase {task.phase_id}"),
        )
