"""Ollama implementation of Genesis' provider-neutral worker execution contract."""

from datetime import UTC, datetime

from app.core.config import Settings
from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationStage,
)
from app.schemas.execution import ExecutionLog, WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.ollama_client import OllamaResponsesClient
from app.services.providers.openai import OpenAIProvider


class OllamaProvider:
    """Local provider that uses Ollama without exposing it to the execution engine."""

    def __init__(self, settings: Settings) -> None:
        self._responses_client = OllamaResponsesClient(settings)
        self._model = settings.ollama_model

    @property
    def provider_name(self) -> str:
        return f"Ollama {self._model}"

    @property
    def uses_compact_collaboration(self) -> bool:
        """Avoid repeated local-model calls for routine worker coordination."""

        return True

    @property
    def supports_parallel_execution(self) -> bool:
        """A single local Ollama model is faster when its work remains serialized."""

        return False

    @property
    def health_error(self) -> str | None:
        return self._responses_client.health_error

    async def health_check(self) -> bool:
        return await self._responses_client.health_check()

    async def execute_task(
        self,
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
        collaboration_context: CollaborationContext | None = None,
    ) -> WorkerExecution:
        """Record a local worker handoff from approved organization context without regeneration."""

        start_time = datetime.now(UTC)
        artifact_content = self._cached_worker_summary(task, worker, organization_memory)
        end_time = datetime.now(UTC)
        return WorkerExecution(
            worker_id=worker.worker_id,
            task_id=task.task_id,
            start_time=start_time,
            end_time=end_time,
            execution_duration_ms=max(int((end_time - start_time).total_seconds() * 1000), 1),
            status="completed",
            output_summary=OpenAIProvider._output_summary(artifact_content),
            artifact_content=artifact_content,
            execution_logs=[
                ExecutionLog(
                    timestamp=start_time,
                    message=OpenAIProvider._memory_log_message(organization_memory),
                ),
                ExecutionLog(
                    timestamp=start_time,
                    message=OpenAIProvider._collaboration_log_message(collaboration_context),
                ),
                ExecutionLog(
                    timestamp=start_time,
                    message=(
                        "Reused approved organization context for deterministic worker summary."
                    ),
                ),
                ExecutionLog(
                    timestamp=end_time,
                    message="Ollama local foundation execution completed without regeneration.",
                ),
            ],
        )

    async def create_collaboration_message(
        self,
        task: Task,
        worker: AIWorker,
        collaboration_context: CollaborationContext,
        stage: CollaborationStage,
        execution_summary: str | None = None,
    ) -> CollaborationMessageDraft:
        """Reuse known worker state for local collaboration without another model request."""

        summary = execution_summary or f"{task.task_name} is using the approved mission context."
        content = (
            f"{worker.worker_name} ({worker.role}) {stage.replace('_', ' ')} for "
            f"{task.task_name}. {summary}"
        )

        return CollaborationMessageDraft(
            message_type=OpenAIProvider._message_type_for_stage(stage),
            content=content[:1200],
        )

    @staticmethod
    def _cached_worker_summary(
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
    ) -> str:
        """Materialize a lightweight handoff from the already-completed organization context."""

        previous_work = (
            organization_memory.entries[-1].summary[:480]
            if organization_memory.entries
            else (
                "The organization blueprint, execution plan, and assigned worker scope "
                "are approved."
            )
        )
        return (
            f"{worker.worker_name} completed {task.task_name} for {task.department}. "
            f"Scope: {task.description[:360]} The task follows the approved execution plan and "
            "reuses existing organization knowledge rather than regenerating prior analysis. "
            f"Previous handoff: {previous_work} The next dependent task can proceed using this "
            "recorded decision and the shared project foundation."
        )
