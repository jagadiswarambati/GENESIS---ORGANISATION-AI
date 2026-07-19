"""Focused fast-path coverage for independent Workspace & Quality generation."""

import asyncio
from datetime import UTC, datetime

from app.core.config import Settings
from app.schemas.artifact import ArtifactCollection, MissionArtifact
from app.schemas.memory import OrganizationMemory
from app.schemas.review import ProjectReviewRequest
from app.schemas.workspace import ProjectWorkspace, WorkspaceGenerationRequest
from app.services.review_providers.ollama import OllamaProjectReviewProvider
from app.services.workspace_engine import WorkspaceEngine


def workspace_quality_fixture() -> tuple[ArtifactCollection, OrganizationMemory, ProjectWorkspace]:
    now = datetime.now(UTC)
    artifact = MissionArtifact(
        artifact_id="artifact-foundation-readme",
        task_id="task-foundation",
        worker_id="worker-foundation",
        department="Research",
        artifact_name="README.md",
        artifact_type="README (.md)",
        description="Project foundation overview.",
        content="# Genesis Project Foundation\n\nApproved project context.",
        generated_at=now,
        version=1,
        status="generated",
    )
    artifacts = ArtifactCollection(artifacts=[artifact])
    memory = OrganizationMemory(entries=[])
    workspace = (
        WorkspaceEngine()
        .generate(
            WorkspaceGenerationRequest(
                project_name="Genesis Quality Demo",
                artifact_collection=artifacts,
                organization_memory=memory,
            )
        )
        .workspace
    )
    return artifacts, memory, workspace


def test_ollama_foundation_review_reuses_workspace_without_model_call() -> None:
    artifacts, memory, workspace = workspace_quality_fixture()
    settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="ollama",
        ollama_model="qwen3:8b",
    )

    review = asyncio.run(
        OllamaProjectReviewProvider(settings).review(
            ProjectReviewRequest(
                workspace=workspace,
                artifact_collection=artifacts,
                organization_memory=memory,
            )
        )
    )

    assert review.overall_score >= 0
    assert review.strengths or review.weaknesses
