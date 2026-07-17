from datetime import datetime, timezone

from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationStage,
)
from app.schemas.execution import ExecutionLog, WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.artifact_catalog import artifact_profile_for


class MockAIProvider:
    """A local provider that records deterministic placeholder task execution."""

    @property
    def provider_name(self) -> str:
        return "mock"

    async def health_check(self) -> bool:
        return True

    async def execute_task(
        self,
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
        collaboration_context: CollaborationContext | None = None,
    ) -> WorkerExecution:
        start_time = datetime.now(timezone.utc)
        end_time = datetime.now(timezone.utc)
        memory_log_message = (
            f"Loaded {len(organization_memory.entries)} organization memory entries."
        )
        return WorkerExecution(
            worker_id=worker.worker_id,
            task_id=task.task_id,
            start_time=start_time,
            end_time=end_time,
            execution_duration_ms=max(int((end_time - start_time).total_seconds() * 1000), 1),
            status="completed",
            output_summary=f"Mock execution completed: {task.task_name}.",
            artifact_content=self._artifact_content(task),
            execution_logs=[
                ExecutionLog(
                    timestamp=start_time,
                    message=memory_log_message,
                ),
                ExecutionLog(timestamp=start_time, message="Mock provider started execution."),
                ExecutionLog(
                    timestamp=start_time,
                    message=self._collaboration_log_message(collaboration_context),
                ),
                ExecutionLog(timestamp=end_time, message="Mock provider completed execution."),
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
        """Produce role-specific, deterministic communication for local collaboration demos."""

        role = worker.role.lower()
        if "research" in role:
            content_by_stage = {
                "before_execution": (
                    "Reviewing available knowledge before completing technology research."
                ),
                "during_execution": "Technology research is in progress. FastAPI is recommended.",
                "after_execution": "Technology research completed. FastAPI recommended.",
            }
            message_type = "suggestion" if stage != "after_execution" else "decision"
        elif "backend" in role:
            content_by_stage = {
                "before_execution": (
                    "Reviewing research and architecture decisions before implementation."
                ),
                "during_execution": "Architecture accepted. Implementation started.",
                "after_execution": "Backend decisions are ready for dependent teams.",
            }
            message_type = "decision" if stage != "after_execution" else "information"
        elif "qa" in role or "quality" in role:
            content_by_stage = {
                "before_execution": "Reviewing prior implementation and test context.",
                "during_execution": (
                    "Waiting for backend completion before finalizing integration coverage."
                ),
                "after_execution": "Quality review context is ready for the next execution phase.",
            }
            message_type = "review_request" if stage == "before_execution" else "information"
        else:
            content_by_stage = {
                "before_execution": f"Reviewing organization context before {task.task_name}.",
                "during_execution": (
                    f"Collaborating on {task.task_name} with shared project knowledge."
                ),
                "after_execution": (
                    f"{task.task_name} completed; findings are available to the organization."
                ),
            }
            message_type = "information"

        return CollaborationMessageDraft(
            message_type=message_type,
            content=content_by_stage[stage],
        )

    @staticmethod
    def _artifact_content(task: Task) -> str:
        """Return predictable file-shaped content for local development and demos."""

        profile = artifact_profile_for(task)
        if profile.extension == ".py":
            return (
                f'"""Mock artifact for {task.task_name}."""\n\n'
                "def test_generated_artifact() -> None:\n"
                '    assert True, "Mock artifact generated"\n'
            )
        if profile.extension in {".ts", ".tsx"}:
            return (
                f"export const generatedArtifact = {{\n"
                f'  task: "{task.task_name}",\n'
                '  status: "generated",\n'
                "};\n"
            )
        if profile.extension in {".yml", ".yaml"}:
            return f"# Mock artifact for {task.task_name}\nversion: '3.9'\nservices: {{}}\n"
        if profile.extension == ".sql":
            return f"-- Mock artifact for {task.task_name}\nCREATE TABLE generated_artifact ();\n"
        return f"# {task.task_name}\n\nMock artifact generated for {task.department}.\n"

    @staticmethod
    def _collaboration_log_message(collaboration_context: CollaborationContext | None) -> str:
        message_count = (
            len(collaboration_context.conversation_history) if collaboration_context else 0
        )
        return f"Loaded {message_count} collaboration messages."
