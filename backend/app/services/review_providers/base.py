from typing import Protocol

from app.schemas.artifact import MissionArtifact
from app.schemas.review import ProjectReviewDraft, ProjectReviewRequest, ReviewSuggestion


class ProjectReviewProvider(Protocol):
    """Review capability contract kept separate from the worker execution provider."""

    @property
    def provider_name(self) -> str: ...

    async def review(self, request: ProjectReviewRequest) -> ProjectReviewDraft: ...

    async def refine_artifact(
        self,
        artifact: MissionArtifact,
        suggestions: list[ReviewSuggestion],
        request: ProjectReviewRequest,
    ) -> str: ...
