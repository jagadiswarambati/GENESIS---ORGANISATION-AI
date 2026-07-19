"""Focused resilience coverage for the collaborative execution boundary."""

import asyncio
import logging
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import collaboration as collaboration_api
from app.core.config import Settings
from app.core.errors import CollaborativeExecutionDeferredError
from app.main import app
from app.schemas.artifact import ArtifactGenerationRequest
from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationStage,
    CollaborativeExecutionRequest,
)
from app.schemas.execution import ExecutionLog, ExecutionRequest, ExecutionResult, WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task, TaskGroup
from app.schemas.worker_assignment import AIWorker, WorkerAssignment, WorkerAssignmentResult
from app.schemas.workflow import Workflow, WorkflowTaskState
from app.services.artifact_generation import ArtifactGenerationService
from app.services.collaboration_engine import CollaborationEngine
from app.services.collaborative_execution import CollaborativeExecutionService
from app.services.organization_memory import OrganizationMemoryService
from app.services.providers.factory import ProviderFactory


class DelayedCollaborationProvider:
    """A provider double that exceeds the configured collaboration budget."""

    @property
    def provider_name(self) -> str:
        return "Delayed AI"

    async def health_check(self) -> bool:
        return True

    async def create_collaboration_message(
        self,
        task: Task,
        worker: AIWorker,
        collaboration_context: CollaborationContext,
        stage: CollaborationStage,
        execution_summary: str | None = None,
    ) -> CollaborationMessageDraft:
        await asyncio.sleep(0.05)
        return CollaborationMessageDraft(message_type="information", content="Delayed message.")

    async def execute_task(
        self,
        task: Task,
        worker: AIWorker,
        organization_memory: OrganizationMemory,
        collaboration_context: CollaborationContext | None = None,
    ) -> None:
        raise AssertionError("The collaboration timeout should occur before task execution.")


def collaborative_execution_request() -> CollaborativeExecutionRequest:
    task = Task(
        task_id="phase-1-task-1",
        task_name="Analyze Market",
        description="Assess the market opportunity.",
        department="Research",
        phase_id=1,
        priority="high",
        estimated_duration="1 day",
        dependencies=[],
    )
    task_group = TaskGroup(
        phase_id=1,
        phase_name="Research",
        department="Research",
        tasks=[task],
    )
    worker = AIWorker(
        worker_id="worker-research-analyst",
        worker_name="Research Analyst",
        role="Research Analyst",
        department="Research",
        assigned_tasks=[task.task_id],
        capabilities=["market research"],
    )
    return CollaborativeExecutionRequest(
        execution_request=ExecutionRequest(
            workflow=Workflow(
                workflow_id="workflow-1",
                task_states=[
                    WorkflowTaskState(
                        task_id=task.task_id,
                        status="ready",
                        dependencies=[],
                        blocked_by=[],
                    )
                ],
            ),
            task_groups=[task_group],
            worker_assignment_result=WorkerAssignmentResult(
                workers=[worker],
                assignments=[WorkerAssignment(task_id=task.task_id, worker_id=worker.worker_id)],
            ),
        ),
    )


def test_collaborative_execution_defers_after_its_timeout(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="mock",
        collaborative_execution_timeout_seconds=0.001,
    )
    monkeypatch.setattr(
        ProviderFactory,
        "create",
        staticmethod(lambda _: DelayedCollaborationProvider()),
    )
    service = CollaborativeExecutionService(settings, CollaborationEngine())

    caplog.set_level(logging.WARNING, logger="app.services.collaborative_execution")
    with pytest.raises(CollaborativeExecutionDeferredError):
        asyncio.run(service.execute_ready_tasks(collaborative_execution_request()))

    assert "Collaborative execution timed out" in caplog.text


def test_collaborative_execution_endpoint_returns_a_typed_deferred_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="mock",
        collaborative_execution_timeout_seconds=0.001,
    )
    monkeypatch.setattr(
        ProviderFactory,
        "create",
        staticmethod(lambda _: DelayedCollaborationProvider()),
    )
    service = CollaborativeExecutionService(settings, CollaborationEngine())
    app.dependency_overrides[collaboration_api.get_collaborative_execution_service] = lambda: (
        service
    )
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/collaborative-executions",
                json=collaborative_execution_request().model_dump(mode="json"),
            )
    finally:
        app.dependency_overrides.pop(collaboration_api.get_collaborative_execution_service, None)

    assert response.status_code == 504
    assert response.json() == {
        "code": "collaborative_execution_deferred",
        "message": (
            "Large collaborative artifacts are still being generated. You can continue using "
            "Genesis while generation resumes in the background."
        ),
    }


def test_artifact_generation_materializes_only_cached_project_foundation() -> None:
    request = collaborative_execution_request()
    execution_request = request.execution_request
    task = execution_request.task_groups[0].tasks[0]
    worker = execution_request.worker_assignment_result.workers[0]
    timestamp = datetime.now(UTC)
    execution_result = ExecutionResult(
        provider_name="Ollama qwen3:8b",
        executions=[
            WorkerExecution(
                worker_id=worker.worker_id,
                task_id=task.task_id,
                start_time=timestamp,
                end_time=timestamp,
                execution_duration_ms=1,
                status="completed",
                output_summary="A compact worker outcome is available.",
                artifact_content="A compact worker outcome is available.",
                execution_logs=[ExecutionLog(timestamp=timestamp, message="Completed.")],
            )
        ],
        workflow=execution_request.workflow,
        organization_memory=OrganizationMemory(entries=[]),
    )
    result = ArtifactGenerationService(OrganizationMemoryService()).generate(
        ArtifactGenerationRequest(
            execution_result=execution_result,
            task_groups=execution_request.task_groups,
            worker_assignment_result=execution_request.worker_assignment_result,
        )
    )

    assert [artifact.artifact_name for artifact in result.artifact_collection.artifacts] == [
        "README.md",
        "project-structure.md",
        "worker-summary.md",
        "deployment-summary.md",
    ]
    assert len(result.organization_memory.entries) == 4


def test_collaboration_memory_projection_respects_long_text_limit() -> None:
    request = collaborative_execution_request()
    task = request.execution_request.task_groups[0].tasks[0]
    worker = request.execution_request.worker_assignment_result.workers[0]
    engine = CollaborationEngine()
    session = engine.append_message(
        engine.create_session(),
        task,
        worker,
        CollaborationMessageDraft(message_type="information", content="a" * 1200),
        "Research",
    )

    memory = engine.store_memory_references(OrganizationMemory(entries=[]), session)

    assert len(memory.entries) == 1
    assert len(memory.entries[0].content) == 1200
