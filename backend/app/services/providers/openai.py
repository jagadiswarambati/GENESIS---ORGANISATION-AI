import json
from datetime import datetime, timezone

from openai import (
    APIConnectionError,
    APIError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)

from app.core.config import Settings
from app.core.errors import ExecutionProviderConfigurationError, ExecutionProviderUnavailableError
from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationStage,
    ConversationMessageType,
)
from app.schemas.execution import ExecutionLog, WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.artifact_catalog import artifact_profile_for

MAX_OUTPUT_SUMMARY_LENGTH = 1200
MEMORY_CONTEXT_LIMIT = 12


class OpenAIProvider:
    """Responses API provider that preserves Genesis' provider-neutral execution contract."""

    def __init__(self, settings: Settings) -> None:
        if not settings.has_openai_api_key:
            raise ExecutionProviderConfigurationError

        api_key = settings.openai_api_key
        assert api_key is not None
        self._client = AsyncOpenAI(api_key=api_key.get_secret_value())
        self._model = settings.openai_model
        self._health_error: str | None = None

    @property
    def provider_name(self) -> str:
        return f"OpenAI {self._model}"

    @property
    def health_error(self) -> str | None:
        return self._health_error

    async def health_check(self) -> bool:
        try:
            await self._client.models.retrieve(self._model)
        except (APIConnectionError, APIStatusError, APIError, APITimeoutError, RateLimitError):
            self._health_error = "OpenAI could not validate the configured API key and model."
            return False

        self._health_error = None
        return True

    async def execute_task(
        self,
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
        collaboration_context: CollaborationContext | None = None,
    ) -> WorkerExecution:
        start_time = datetime.now(timezone.utc)
        try:
            response = await self._client.responses.create(
                model=self._model,
                instructions=(
                    "You are an AI worker in Genesis. Complete the assigned task by producing "
                    "the requested project artifact. Return only the complete artifact content: "
                    "no explanations, no markdown fences around source code, and no preamble. "
                    "For code, produce a valid single-file implementation. For markdown, produce "
                    "a structured, substantive document. Keep the artifact below 20,000 characters."
                ),
                input=self._build_input(task, worker, organization_memory, collaboration_context),
            )
        except (
            APIConnectionError,
            APIStatusError,
            APIError,
            APITimeoutError,
            RateLimitError,
        ) as error:
            raise ExecutionProviderUnavailableError from error

        end_time = datetime.now(timezone.utc)
        artifact_content = response.output_text.strip()[:20_000]
        if not artifact_content:
            artifact_content = "OpenAI completed the task without returning artifact content."
        output_summary = self._output_summary(artifact_content)

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
                    message=self._memory_log_message(organization_memory),
                ),
                ExecutionLog(
                    timestamp=start_time,
                    message=self._collaboration_log_message(collaboration_context),
                ),
                ExecutionLog(
                    timestamp=start_time,
                    message="OpenAI Responses API started execution.",
                ),
                ExecutionLog(
                    timestamp=end_time,
                    message="OpenAI Responses API completed execution.",
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
        """Ask the selected OpenAI model for a concise role-specific organization message."""

        try:
            response = await self._client.responses.create(
                model=self._model,
                instructions=(
                    "You are a role-specific AI worker collaborating inside Genesis. "
                    "Write one concise, factual message for colleagues. Ground it in the supplied "
                    "memory, artifacts, decisions, and conversation history. Do not use markdown, "
                    "greetings, or a preamble. If an execution summary is supplied, "
                    "communicate its "
                    "outcome accurately. Keep it below 1,200 characters."
                ),
                input=json.dumps(
                    {
                        "stage": stage,
                        "task": {
                            "name": task.task_name,
                            "description": task.description,
                            "department": task.department,
                        },
                        "worker": {"name": worker.worker_name, "role": worker.role},
                        "execution_summary": execution_summary,
                        "collaboration_context": self._collaboration_payload(collaboration_context),
                    }
                ),
            )
        except (
            APIConnectionError,
            APIStatusError,
            APIError,
            APITimeoutError,
            RateLimitError,
        ) as error:
            raise ExecutionProviderUnavailableError from error

        content = response.output_text.strip()[:MAX_OUTPUT_SUMMARY_LENGTH]
        if not content:
            content = f"{worker.worker_name} is coordinating {task.task_name}."
        return CollaborationMessageDraft(
            message_type=self._message_type_for_stage(stage),
            content=content,
        )

    @staticmethod
    def _build_input(
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
        collaboration_context: CollaborationContext | None,
    ) -> str:
        memory_context = [
            {"title": entry.title, "summary": entry.summary, "tags": entry.tags}
            for entry in organization_memory.entries[-MEMORY_CONTEXT_LIMIT:]
        ]
        profile = artifact_profile_for(task)
        return json.dumps(
            {
                "task": {
                    "name": task.task_name,
                    "description": task.description,
                    "department": task.department,
                },
                "worker": {
                    "name": worker.worker_name,
                    "role": worker.role,
                    "capabilities": worker.capabilities,
                },
                "organization_memory": memory_context,
                "artifact": {
                    "artifact_type": profile.artifact_type,
                    "file_extension": profile.extension,
                },
                "collaboration_context": (
                    OpenAIProvider._collaboration_payload(collaboration_context)
                    if collaboration_context
                    else None
                ),
            }
        )

    @staticmethod
    def _output_summary(artifact_content: str) -> str:
        """Keep the legacy execution summary concise while retaining full artifact content."""

        compact = " ".join(artifact_content.split())
        return compact[:MAX_OUTPUT_SUMMARY_LENGTH]

    @staticmethod
    def _memory_log_message(organization_memory: OrganizationMemory) -> str:
        return f"Loaded {len(organization_memory.entries)} organization memory entries."

    @staticmethod
    def _collaboration_log_message(collaboration_context: CollaborationContext | None) -> str:
        message_count = (
            len(collaboration_context.conversation_history) if collaboration_context else 0
        )
        return f"Loaded {message_count} collaboration messages."

    @staticmethod
    def _message_type_for_stage(stage: CollaborationStage) -> ConversationMessageType:
        return {
            "before_execution": "question",
            "during_execution": "information",
            "after_execution": "decision",
        }[stage]

    @staticmethod
    def _collaboration_payload(collaboration_context: CollaborationContext) -> dict[str, object]:
        return {
            "organization_memory": [
                {"title": entry.title, "summary": entry.summary, "tags": entry.tags}
                for entry in collaboration_context.organization_memory.entries[-12:]
            ],
            "relevant_artifacts": [
                {
                    "name": artifact.artifact_name,
                    "type": artifact.artifact_type,
                    "content": artifact.content[:1600],
                }
                for artifact in collaboration_context.relevant_artifacts
            ],
            "previous_decisions": [
                {"sender": message.sender_worker_id, "content": message.content}
                for message in collaboration_context.previous_decisions
            ],
            "conversation_history": [
                {
                    "sender": message.sender_worker_id,
                    "type": message.message_type,
                    "content": message.content,
                }
                for message in collaboration_context.conversation_history
            ],
        }
