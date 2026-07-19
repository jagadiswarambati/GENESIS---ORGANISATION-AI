"""Ollama implementation of the existing project-review provider contract."""

import json
import logging

from app.core.config import Settings
from app.core.errors import ArchitectError, ProjectReviewProviderUnavailableError
from app.schemas.artifact import MissionArtifact
from app.schemas.review import ProjectReviewDraft, ProjectReviewRequest, ReviewSuggestion
from app.services.ollama_client import OllamaResponsesClient
from app.services.review_providers.mock import DeterministicProjectReviewProvider
from app.services.review_providers.openai import MAX_ARTIFACT_CONTENT_LENGTH
from app.services.review_providers.schemas import REFINED_ARTIFACT_SCHEMA

logger = logging.getLogger(__name__)


class OllamaProjectReviewProvider:
    """Use the local Ollama client without coupling review orchestration to a vendor."""

    def __init__(self, settings: Settings) -> None:
        self._client = OllamaResponsesClient(settings)
        self._model = settings.ollama_model

    @property
    def provider_name(self) -> str:
        return f"Ollama {self._model} Project Reviewer"

    async def review(self, request: ProjectReviewRequest) -> ProjectReviewDraft:
        """Reuse the generated workspace for an immediate local foundation review."""

        return await DeterministicProjectReviewProvider().review(request)

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
                            for entry in request.organization_memory.entries[-6:]
                        ],
                    }
                ),
                instructions=(
                    "You are Genesis' selective project refiner. Improve only the supplied "
                    "file in response to the supplied review suggestions. Keep the response "
                    "under 300 words and return JSON with complete file content only."
                ),
                schema=REFINED_ARTIFACT_SCHEMA,
                schema_name="refined_artifact",
            )
            content = json.loads(output)["content"].strip()[:MAX_ARTIFACT_CONTENT_LENGTH]
        except (ArchitectError, KeyError, TypeError, ValueError) as error:
            logger.exception(
                "Ollama project refinement failed: exception_type=%s exception_message=%s",
                type(error).__name__,
                str(error),
            )
            raise ProjectReviewProviderUnavailableError from error

        if not content:
            raise ProjectReviewProviderUnavailableError
        return content
