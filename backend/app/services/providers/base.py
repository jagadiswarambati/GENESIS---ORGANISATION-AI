from typing import Protocol

from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationStage,
)
from app.schemas.execution import WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker


class AIProvider(Protocol):
    """Provider contract consumed by the execution engine, independent of any vendor."""

    @property
    def provider_name(self) -> str: ...

    async def health_check(self) -> bool: ...

    async def execute_task(
        self,
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
        collaboration_context: CollaborationContext | None = None,
    ) -> WorkerExecution: ...

    async def create_collaboration_message(
        self,
        task: Task,
        worker: AIWorker,
        collaboration_context: CollaborationContext,
        stage: CollaborationStage,
        execution_summary: str | None = None,
    ) -> CollaborationMessageDraft: ...
