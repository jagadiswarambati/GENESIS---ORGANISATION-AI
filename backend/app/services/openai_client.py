import json
from typing import Any, Protocol

from openai import (
    APIConnectionError,
    APIError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)

from app.core.config import Settings
from app.core.errors import (
    ArchitectConfigurationError,
    ArchitectProviderError,
    ArchitectRateLimitError,
    ArchitectTimeoutError,
)


class OpenAIResponsesClient:
    """Shared Responses API adapter used by AI capabilities that require structured output."""

    def __init__(self, settings: Settings) -> None:
        if not settings.has_openai_api_key:
            raise ArchitectConfigurationError

        api_key = settings.openai_api_key
        assert api_key is not None
        self._client = AsyncOpenAI(api_key=api_key.get_secret_value())
        self._model = settings.openai_model

    async def create_json(
        self,
        *,
        input_text: str,
        instructions: str,
        schema: dict[str, Any],
        schema_name: str,
    ) -> str:
        try:
            response = await self._client.responses.create(
                model=self._model,
                input=input_text,
                instructions=instructions,
                text={
                    "format": {
                        "type": "json_schema",
                        "name": schema_name,
                        "schema": schema,
                        "strict": True,
                    }
                },
            )
        except RateLimitError as error:
            raise ArchitectRateLimitError from error
        except APITimeoutError as error:
            raise ArchitectTimeoutError from error
        except (APIConnectionError, APIStatusError, APIError) as error:
            raise ArchitectProviderError from error

        output = response.output_text.strip()
        if not output:
            raise ArchitectProviderError

        try:
            json.loads(output)
        except json.JSONDecodeError as error:
            raise ArchitectProviderError from error

        return output


def create_openai_responses_client(settings: Settings) -> OpenAIResponsesClient:
    return OpenAIResponsesClient(settings)


class ResponsesClient(Protocol):
    """Minimal structured-response contract consumed by AI capabilities."""

    async def create_json(
        self,
        *,
        input_text: str,
        instructions: str,
        schema: dict[str, Any],
        schema_name: str,
    ) -> str: ...


def create_responses_client(settings: Settings) -> ResponsesClient:
    """Select the configured structured-response client without exposing a vendor to callers."""

    if settings.ai_provider == "gemini":
        from app.services.gemini_client import GeminiResponsesClient

        return GeminiResponsesClient(settings)
    return create_openai_responses_client(settings)
