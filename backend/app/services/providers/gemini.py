import json
from datetime import UTC, datetime

from app.core.config import Settings
from app.core.errors import (
    ArchitectConfigurationError,
    ArchitectError,
    ExecutionProviderConfigurationError,
    ExecutionProviderUnavailableError,
)
from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationStage,
)
from app.schemas.execution import ExecutionLog, WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.gemini_client import GeminiResponsesClient
from app.services.providers.openai import MAX_OUTPUT_SUMMARY_LENGTH, OpenAIProvider


class GeminiProvider:
    """Gemini implementation of the provider-neutral AI worker contract."""

    def __init__(self, settings: Settings) -> None:
        try:
            self._responses_client = GeminiResponsesClient(settings)
        except ArchitectConfigurationError as error:
            raise ExecutionProviderConfigurationError from error
        self._model = settings.gemini_model

    @property
    def provider_name(self) -> str:
        return f"Gemini {self._model}"

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
        start_time = datetime.now(UTC)
        try:
            artifact_content = await self._responses_client.create_text(
                input_text=OpenAIProvider._build_input(
                    task,
                    worker,
                    organization_memory,
                    collaboration_context,
                ),
                instructions=(
                    "You are an AI worker in Genesis. Complete the assigned task by producing "
                    "the requested project artifact. Return only the complete artifact content: "
                    "no explanations, no markdown fences around source code, and no preamble. "
                    "For code, produce a valid single-file implementation. For markdown, produce "
                    "a structured, substantive document. Keep the artifact below 20,000 characters."
                ),
            )
        except ArchitectError as error:
            raise ExecutionProviderUnavailableError from error

        end_time = datetime.now(UTC)
        artifact_content = artifact_content[:20_000]
        output_summary = OpenAIProvider._output_summary(artifact_content)

        return WorkerExecution(
            worker_id=worker.worker_id,
            task_id=task.task_id,
            start_time=start_time,
            end_time=end_time,
            execution_duration_ms=max(int((end_time - start_time).total_seconds() * 1000), 1),
            status="completed",
            output_summary=output_summary,
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
                ExecutionLog(timestamp=start_time, message="Gemini API started execution."),
                ExecutionLog(timestamp=end_time, message="Gemini API completed execution."),
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
        """Generate a concise, role-specific collaboration message through Gemini."""

        try:
            content = await self._responses_client.create_text(
                input_text=json.dumps(OpenAIProvider._collaboration_payload(collaboration_context)),
                instructions=(
                    "You are a role-specific AI worker collaborating inside Genesis. "
                    "Write one concise, factual message for colleagues. Ground it in the supplied "
                    "memory, artifacts, decisions, and conversation history. Do not use markdown, "
                    "greetings, or a preamble. If an execution summary is supplied, communicate "
                    "its outcome accurately. Keep it below 1,200 characters.\n\n"
                    f"Stage: {stage}\n"
                    f"Task: {task.task_name}\n"
                    f"Description: {task.description}\n"
                    f"Worker: {worker.worker_name} ({worker.role})\n"
                    f"Execution summary: {execution_summary or 'None'}"
                ),
            )
        except ArchitectError as error:
            raise ExecutionProviderUnavailableError from error

        return CollaborationMessageDraft(
            message_type=OpenAIProvider._message_type_for_stage(stage),
            content=content[:MAX_OUTPUT_SUMMARY_LENGTH],
        )
