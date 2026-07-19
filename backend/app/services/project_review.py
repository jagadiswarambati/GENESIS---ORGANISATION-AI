import asyncio
import logging
from datetime import UTC, datetime
from hashlib import sha256

from app.core.errors import ProjectReviewDeferredError, ProjectReviewValidationError
from app.schemas.artifact import ArtifactCollection, MissionArtifact
from app.schemas.memory import MemoryEntry, OrganizationMemory
from app.schemas.review import (
    ProjectRefinementRequest,
    ProjectRefinementResult,
    ProjectReview,
    ProjectReviewRequest,
    RefinementRequest,
    ReviewSuggestion,
)
from app.schemas.workspace import WorkspaceFile, WorkspaceFolder
from app.services.review_providers.base import ProjectReviewProvider

logger = logging.getLogger(__name__)
PROJECT_REVIEW_TIMEOUT_SECONDS = 60


class ProjectReviewService:
    """Review project outputs and selectively refine source artifacts without changing execution."""

    def __init__(self, provider: ProjectReviewProvider) -> None:
        self._provider = provider

    async def create_review(self, request: ProjectReviewRequest) -> ProjectReview:
        """Produce a typed review from existing workspace, package, memory, and quality signals."""

        try:
            async with asyncio.timeout(PROJECT_REVIEW_TIMEOUT_SECONDS):
                draft = await self._provider.review(request)
        except TimeoutError as error:
            logger.warning(
                "Project review timed out: provider=%s timeout_seconds=%s workspace_id=%s",
                self._provider.provider_name,
                PROJECT_REVIEW_TIMEOUT_SECONDS,
                request.workspace.workspace_id,
                exc_info=error,
            )
            raise ProjectReviewDeferredError from error

        created_at = datetime.now(UTC)
        review_id = self._review_id(request.workspace.workspace_id, created_at)
        workspace_file_paths = {
            file.file_path for file in self._workspace_files(request.workspace.root_folder)
        }
        suggestions = [
            ReviewSuggestion(
                **item.model_dump(),
                suggestion_id=self._suggestion_id(review_id, index),
                timestamp=created_at,
            )
            for index, item in enumerate(draft.suggestions, start=1)
            if item.related_file in workspace_file_paths
        ]
        return ProjectReview(
            review_id=review_id,
            created_at=created_at,
            overall_score=draft.overall_score,
            suggestions=suggestions,
            strengths=draft.strengths,
            weaknesses=draft.weaknesses,
            improvement_opportunities=draft.improvement_opportunities,
            source_workspace_id=request.workspace.workspace_id,
            source_workspace_updated_at=request.workspace.last_updated,
            source_package_id=(
                request.project_package.package_id if request.project_package else None
            ),
            reviewer_name=self._provider.provider_name,
        )

    async def refine(self, request: ProjectRefinementRequest) -> ProjectRefinementResult:
        """Create updated versions only for artifacts referenced by selected review suggestions."""

        review = request.project_review
        if (
            review.source_workspace_id != request.workspace.workspace_id
            or review.source_workspace_updated_at != request.workspace.last_updated
        ):
            raise ProjectReviewValidationError

        selected = [
            suggestion
            for suggestion in review.suggestions
            if suggestion.suggestion_id in request.selected_suggestion_ids
            and suggestion.status == "pending"
        ]
        if not selected:
            raise ProjectReviewValidationError

        files_by_path = {
            file.file_path: file for file in self._workspace_files(request.workspace.root_folder)
        }
        artifacts_by_id = {
            artifact.artifact_id: artifact for artifact in request.artifact_collection.artifacts
        }
        suggestions_by_artifact: dict[str, list[ReviewSuggestion]] = {}
        for suggestion in selected:
            workspace_file = files_by_path.get(suggestion.related_file or "")
            if workspace_file is None or workspace_file.source_artifact_id not in artifacts_by_id:
                continue
            suggestions_by_artifact.setdefault(
                workspace_file.source_artifact_id,
                [],
            ).append(suggestion)

        if not suggestions_by_artifact:
            raise ProjectReviewValidationError

        review_context = ProjectReviewRequest(
            workspace=request.workspace,
            artifact_collection=request.artifact_collection,
            organization_memory=request.organization_memory,
        )
        refined_at = datetime.now(UTC)
        refined_artifacts: list[MissionArtifact] = []
        resolved_suggestion_ids: set[str] = set()
        for artifact_id, suggestions in suggestions_by_artifact.items():
            artifact = artifacts_by_id[artifact_id]
            content = await self._provider.refine_artifact(artifact, suggestions, review_context)
            refined_artifacts.append(
                artifact.model_copy(
                    update={
                        "content": content,
                        "description": (
                            f"{artifact.description} Refined from project review suggestions."
                        ),
                        "generated_at": refined_at,
                        "version": artifact.version + 1,
                    }
                )
            )
            resolved_suggestion_ids.update(suggestion.suggestion_id for suggestion in suggestions)

        updated_suggestions = [
            suggestion.model_copy(
                update={"status": "resolved"}
                if suggestion.suggestion_id in resolved_suggestion_ids
                else {}
            )
            for suggestion in review.suggestions
        ]
        updated_review = review.model_copy(
            update={
                "overall_score": min(100, review.overall_score + 4 * len(resolved_suggestion_ids)),
                "suggestions": updated_suggestions,
            }
        )
        refinement_request = RefinementRequest(
            refinement_request_id=self._refinement_request_id(review.review_id, refined_at),
            review_id=review.review_id,
            selected_suggestion_ids=[item.suggestion_id for item in selected],
            affected_artifact_ids=sorted(suggestions_by_artifact),
            created_at=refined_at,
            status="applied",
            summary=(
                f"Refined {len(refined_artifacts)} affected artifact"
                f"{'s' if len(refined_artifacts) != 1 else ''} from "
                f"{len(resolved_suggestion_ids)} selected review suggestion"
                f"{'s' if len(resolved_suggestion_ids) != 1 else ''}."
            ),
        )
        memory = self._record_refinement_memory(
            request.organization_memory,
            refinement_request,
            refined_at,
        )
        return ProjectRefinementResult(
            project_review=updated_review,
            refinement_request=refinement_request,
            artifact_collection=ArtifactCollection(artifacts=refined_artifacts),
            organization_memory=memory,
        )

    @staticmethod
    def _workspace_files(folder: WorkspaceFolder) -> list[WorkspaceFile]:
        files = list(folder.child_files)
        for child in folder.child_folders:
            files.extend(ProjectReviewService._workspace_files(child))
        return files

    @staticmethod
    def _record_refinement_memory(
        memory: OrganizationMemory,
        refinement_request: RefinementRequest,
        timestamp: datetime,
    ) -> OrganizationMemory:
        if len(memory.entries) >= 256:
            return memory

        entry = MemoryEntry(
            memory_id=f"memory-{refinement_request.refinement_request_id}",
            task_id="project-refinement",
            worker_id="project-reviewer",
            department="Quality",
            title="Project refinement applied",
            summary=refinement_request.summary,
            content=(
                f"Review ID: {refinement_request.review_id}\n"
                f"Affected artifacts: {', '.join(refinement_request.affected_artifact_ids)}"
            ),
            timestamp=timestamp,
            tags=["project-review", "refinement", "quality"],
        )
        return memory.model_copy(update={"entries": [*memory.entries, entry]})

    @staticmethod
    def _review_id(workspace_id: str, created_at: datetime) -> str:
        source = f"{workspace_id}:{created_at.isoformat()}"
        return f"review-{sha256(source.encode()).hexdigest()[:12]}"

    @staticmethod
    def _suggestion_id(review_id: str, index: int) -> str:
        return f"suggestion-{sha256(f'{review_id}:{index}'.encode()).hexdigest()[:12]}"

    @staticmethod
    def _refinement_request_id(review_id: str, created_at: datetime) -> str:
        source = f"{review_id}:{created_at.isoformat()}"
        return f"refinement-{sha256(source.encode()).hexdigest()[:12]}"
