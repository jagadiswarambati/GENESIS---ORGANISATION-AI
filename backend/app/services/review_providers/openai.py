import json

from openai import (
    APIConnectionError,
    APIError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)

from app.core.config import Settings
from app.core.errors import ProjectReviewConfigurationError, ProjectReviewProviderUnavailableError
from app.schemas.artifact import MissionArtifact
from app.schemas.review import (
    ProjectReviewDraft,
    ProjectReviewRequest,
    ReviewSuggestion,
)
from app.schemas.workspace import WorkspaceFile, WorkspaceFolder

MAX_ARTIFACT_CONTENT_LENGTH = 20_000
MAX_CONTEXT_FILES = 18
MAX_CONTEXT_FILE_CHARS = 2_400


class OpenAIProjectReviewProvider:
    """Responses API implementation of the dedicated Genesis project-review contract."""

    def __init__(self, settings: Settings) -> None:
        if not settings.has_openai_api_key:
            raise ProjectReviewConfigurationError

        api_key = settings.openai_api_key
        assert api_key is not None
        self._client = AsyncOpenAI(api_key=api_key.get_secret_value())
        self._model = settings.openai_model

    @property
    def provider_name(self) -> str:
        return f"OpenAI {self._model} Project Reviewer"

    async def review(self, request: ProjectReviewRequest) -> ProjectReviewDraft:
        try:
            response = await self._client.responses.create(
                model=self._model,
                instructions=(
                    "You are Genesis' software project reviewer. Review only the supplied "
                    "generated project context. Return a concise, evidence-based assessment. "
                    "Do not propose a whole-project rewrite. Every suggestion that can be "
                    "refined must reference one supplied workspace file. "
                    "Return only JSON matching the schema."
                ),
                input=json.dumps(self._review_context(request)),
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "project_review_draft",
                        "schema": ProjectReviewDraft.model_json_schema(),
                        "strict": True,
                    }
                },
            )
            return ProjectReviewDraft.model_validate_json(response.output_text)
        except (
            APIConnectionError,
            APIStatusError,
            APIError,
            APITimeoutError,
            RateLimitError,
            ValueError,
        ) as error:
            raise ProjectReviewProviderUnavailableError from error

    async def refine_artifact(
        self,
        artifact: MissionArtifact,
        suggestions: list[ReviewSuggestion],
        request: ProjectReviewRequest,
    ) -> str:
        try:
            response = await self._client.responses.create(
                model=self._model,
                instructions=(
                    "You are Genesis' selective project refiner. Improve only the supplied "
                    "file in response to the supplied review suggestions. Preserve its role, "
                    "file type, and existing useful content. "
                    "Return only the complete file content, without markdown fences or a preamble."
                ),
                input=json.dumps(
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
            )
        except (
            APIConnectionError,
            APIStatusError,
            APIError,
            APITimeoutError,
            RateLimitError,
        ) as error:
            raise ProjectReviewProviderUnavailableError from error

        content = response.output_text.strip()[:MAX_ARTIFACT_CONTENT_LENGTH]
        if not content:
            raise ProjectReviewProviderUnavailableError
        return content

    @staticmethod
    def _review_context(request: ProjectReviewRequest) -> dict[str, object]:
        files = OpenAIProjectReviewProvider._workspace_files(request.workspace.root_folder)
        return {
            "workspace": {
                "project_name": request.workspace.project_name,
                "files": [
                    {"path": file.file_path, "content": file.file_content[:MAX_CONTEXT_FILE_CHARS]}
                    for file in files[:MAX_CONTEXT_FILES]
                ],
            },
            "organization_memory": [
                {"title": entry.title, "summary": entry.summary, "tags": entry.tags}
                for entry in request.organization_memory.entries[-12:]
            ],
            "validation_report": (
                (
                    request.validation_report.model_dump(mode="json")
                    if request.validation_report
                    else None
                )
            ),
            "verification_report": (
                request.verification_report.model_dump(mode="json")
                if request.verification_report
                else None
            ),
            "package_files": request.package_included_files,
        }

    @staticmethod
    def _workspace_files(folder: WorkspaceFolder) -> list[WorkspaceFile]:
        files = list(folder.child_files)
        for child in folder.child_folders:
            files.extend(OpenAIProjectReviewProvider._workspace_files(child))
        return files
