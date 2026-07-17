import json
import logging
from typing import Any, NoReturn

from google import genai
from google.genai import types

from app.core.config import Settings
from app.core.errors import (
    ArchitectConfigurationError,
    ArchitectModelUnavailableError,
    ArchitectProviderError,
    ArchitectRateLimitError,
    ArchitectTimeoutError,
)

logger = logging.getLogger(__name__)


class GeminiResponsesClient:
    """Gemini adapter for Genesis capabilities that require structured JSON output."""

    def __init__(self, settings: Settings) -> None:
        if not settings.has_gemini_api_key:
            raise ArchitectConfigurationError

        api_key = settings.gemini_api_key
        assert api_key is not None
        self._client = genai.Client(api_key=api_key.get_secret_value()).aio
        self._model = settings.gemini_model
        self._health_error: str | None = None

    async def create_json(
        self,
        *,
        input_text: str,
        instructions: str,
        schema: dict[str, Any],
        schema_name: str,
    ) -> str:
        """Generate and validate JSON using Gemini's structured-output support."""

        del schema_name
        try:
            response = await self._client.interactions.create(
                model=self._model,
                input=input_text,
                system_instruction=instructions,
                response_format={
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": schema,
                },
            )
        except Exception as error:
            self._raise_provider_error(error)

        output = (response.output_text or "").strip()
        if not output:
            raise ArchitectProviderError

        try:
            json.loads(output)
        except json.JSONDecodeError as error:
            raise ArchitectProviderError from error

        return output

    @property
    def health_error(self) -> str | None:
        return self._health_error

    async def health_check(self) -> bool:
        """Confirm that the configured Gemini model is reachable without generating content."""

        try:
            await self._client.models.get(model=self._model)
        except Exception:
            self._health_error = "Gemini could not validate the configured API key and model."
            return False

        self._health_error = None
        return True

    async def create_text(self, *, input_text: str, instructions: str) -> str:
        """Generate text for provider contracts that do not require structured JSON."""

        try:
            response = await self._client.models.generate_content(
                model=self._model,
                contents=input_text,
                config=types.GenerateContentConfig(system_instruction=instructions),
            )
        except Exception as error:
            self._raise_provider_error(error)

        output = (response.text or "").strip()
        if not output:
            raise ArchitectProviderError
        return output

    @staticmethod
    def _raise_provider_error(error: Exception) -> NoReturn:
        """Map SDK-specific transport failures to Genesis' stable Architect error contract."""

        status_code = getattr(error, "status_code", getattr(error, "code", None))
        message = str(getattr(error, "message", error)).lower()
        logger.warning(
            "Gemini request failed with status %s: %s",
            status_code,
            message[:500],
        )
        if status_code == 404 and "model" in message:
            raise ArchitectModelUnavailableError from error
        if status_code == 429:
            raise ArchitectRateLimitError from error
        if status_code in {408, 504} or isinstance(error, TimeoutError):
            raise ArchitectTimeoutError from error
        raise ArchitectProviderError from error


def create_gemini_responses_client(settings: Settings) -> GeminiResponsesClient:
    return GeminiResponsesClient(settings)
