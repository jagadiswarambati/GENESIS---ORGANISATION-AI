import json

from app.core.config import Settings
from app.core.errors import (
    ArchitectConfigurationError,
    ArchitectError,
    ProjectReviewConfigurationError,
    ProjectReviewProviderUnavailableError,
)
from app.schemas.artifact import MissionArtifact
from app.schemas.review import (
    ProjectReviewDraft,
    ProjectReviewRequest,
    ReviewSuggestion,
)
from app.services.gemini_client import GeminiResponsesClient
from app.services.review_providers.openai import (
    MAX_ARTIFACT_CONTENT_LENGTH,
    OpenAIProjectReviewProvider,
)

REFINED_ARTIFACT_SCHEMA = {
    "type": "object",
    "properties": {"content": {"type": "string"}},
    "required": ["content"],
    "additionalProperties": False,
}


class GeminiProjectReviewProvider:
    """Gemini implementation of the existing dedicated project-review contract."""

    def __init__(self, settings: Settings) -> None:
        try:
            self._client = GeminiResponsesClient(settings)
        except ArchitectConfigurationError as error:
            raise ProjectReviewConfigurationError from error
        self._model = settings.gemini_model

    @property
    def provider_name(self) -> str:
        return f"Gemini {self._model} Project Reviewer"

    async def review(self, request: ProjectReviewRequest) -> ProjectReviewDraft:
        try:
            output = await self._client.create_json(
                input_text=json.dumps(OpenAIProjectReviewProvider._review_context(request)),
                instructions=(
                    "You are Genesis' software project reviewer. Review only the supplied "
                    "generated project context. Return a concise, evidence-based assessment. "
                    "Do not propose a whole-project rewrite. Every suggestion that can be "
                    "refined must reference one supplied workspace file. "
                    "Return only JSON matching the schema."
                ),
                schema=ProjectReviewDraft.model_json_schema(),
                schema_name="project_review_draft",
            )
            return ProjectReviewDraft.model_validate_json(output)
        except (ArchitectError, ValueError) as error:
            raise ProjectReviewProviderUnavailableError from error

    async def refine_artifact(
        self,
        artifact: MissionArtifact,
        suggestions: list[ReviewSuggestion],
        request: ProjectReviewRequest,
    ) -> str:
        try:
            output = await self._client.create_json(
                input_text=json.dumps(
                    {
                        "artifact": {
                            "name": artifact.artifact_name,
                            "type": artifact.artifact_type,
                            "department": artifact.department,
                            "content": artifact.content,
                        },
                        "suggestions": [item.model_dump(mode="json") for item in suggestions],
                        "organization_memory": [
                            {"title": entry.title, "summary": entry.summary}
                            for entry in request.organization_memory.entries[-12:]
                        ],
                    }
                ),
                instructions=(
                    "You are Genesis' selective project refiner. Improve only the supplied "
                    "file in response to the supplied review suggestions. Preserve its role, "
                    "file type, and existing useful content. "
                    "Return JSON with the complete refined file content in the content field."
                ),
                schema=REFINED_ARTIFACT_SCHEMA,
                schema_name="refined_artifact",
            )
            content = json.loads(output)["content"].strip()[:MAX_ARTIFACT_CONTENT_LENGTH]
        except (ArchitectError, KeyError, TypeError, ValueError) as error:
            raise ProjectReviewProviderUnavailableError from error

        if not content:
            raise ProjectReviewProviderUnavailableError
        return content
