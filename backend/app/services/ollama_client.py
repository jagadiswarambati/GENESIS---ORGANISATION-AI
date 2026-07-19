"""HTTP adapter for Ollama's local generate API.

The adapter preserves Genesis' structured-response contract so callers remain
independent of the selected AI provider.
"""

import json
import logging
from typing import Any

import httpx

from app.core.config import Settings
from app.core.errors import (
    ArchitectError,
    ArchitectProviderError,
    ArchitectRateLimitError,
    ArchitectTimeoutError,
    ArchitectValidationError,
    OllamaInvalidJsonError,
    OllamaModelUnavailableError,
    OllamaUnavailableError,
)
from app.services.architect_parser import validate_organization_blueprint

OLLAMA_CONNECT_TIMEOUT_SECONDS = 5.0
OLLAMA_GENERATION_TIMEOUT_SECONDS = 120.0
OLLAMA_TAGS_PATH = "/api/tags"
OLLAMA_GENERATE_PATH = "/api/generate"
ORGANIZATION_BLUEPRINT_SCHEMA_NAME = "organization_blueprint"
STRICT_JSON_INSTRUCTION = "Return ONLY valid JSON."

logger = logging.getLogger(__name__)


class OllamaResponsesClient:
    """Async local Ollama client matching the existing structured-response contract."""

    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.ollama_base_url
        self._model = settings.ollama_model
        self._timeout = httpx.Timeout(
            OLLAMA_GENERATION_TIMEOUT_SECONDS,
            connect=OLLAMA_CONNECT_TIMEOUT_SECONDS,
        )
        self._health_error: str | None = None

    @property
    def model(self) -> str:
        """Return the configured local model name without exposing other settings."""

        return self._model

    @property
    def health_error(self) -> str | None:
        """Return the last safe health-check diagnostic, if any."""

        return self._health_error

    async def health_check(self) -> bool:
        """Verify that Ollama is reachable and the configured model has been installed."""

        try:
            response = await self._request("GET", OLLAMA_TAGS_PATH)
            payload = response.json()
            model_names = {
                str(item.get("name", ""))
                for item in payload.get("models", [])
                if isinstance(item, dict)
            }
        except ArchitectError:
            return False
        except (TypeError, ValueError, json.JSONDecodeError):
            self._health_error = "Ollama returned an invalid model catalog."
            return False

        if self._model not in model_names:
            self._health_error = (
                f"Ollama server is reachable, but model {self._model!r} is not installed."
            )
            return False

        self._health_error = None
        return True

    async def create_json(
        self,
        *,
        input_text: str,
        instructions: str,
        schema: dict[str, Any],
        schema_name: str,
    ) -> str:
        """Generate and validate one JSON response, retrying once for malformed local output."""

        for attempt in range(2):
            attempt_instructions = instructions
            if attempt:
                attempt_instructions = f"{instructions}\n\n{STRICT_JSON_INSTRUCTION}"

            output = await self._generate(
                input_text=input_text,
                instructions=attempt_instructions,
                schema=schema,
            )
            try:
                return self._validated_json_output(output, schema_name)
            except (ArchitectValidationError, json.JSONDecodeError) as error:
                logger.warning(
                    "Ollama structured response parsing failed: model=%s schema_name=%s "
                    "attempt=%s exception_type=%s exception_message=%s provider_response=%r",
                    self._model,
                    schema_name,
                    attempt + 1,
                    type(error).__name__,
                    str(error),
                    output[:4_000],
                    exc_info=error,
                )
                if attempt:
                    raise OllamaInvalidJsonError from error

        raise OllamaInvalidJsonError from None

    async def create_text(
        self,
        *,
        input_text: str,
        instructions: str,
        max_output_tokens: int | None = None,
        think: bool | None = None,
    ) -> str:
        """Generate non-structured worker output through the same local HTTP API."""

        return await self._generate(
            input_text=input_text,
            instructions=instructions,
            max_output_tokens=max_output_tokens,
            think=think,
        )

    async def _generate(
        self,
        *,
        input_text: str,
        instructions: str,
        schema: dict[str, Any] | None = None,
        max_output_tokens: int | None = None,
        think: bool | None = None,
    ) -> str:
        request: dict[str, Any] = {
            "model": self._model,
            "prompt": input_text,
            "system": instructions,
            "stream": False,
        }
        if schema is not None:
            request["format"] = schema
        if max_output_tokens is not None:
            request["options"] = {"num_predict": max_output_tokens}
        if think is not None:
            request["think"] = think

        logger.info(
            "Ollama generation request: model=%s prompt_characters=%s instruction_characters=%s "
            "structured=%s max_output_tokens=%s think=%s",
            self._model,
            len(input_text),
            len(instructions),
            schema is not None,
            max_output_tokens,
            think,
        )
        response = await self._request("POST", OLLAMA_GENERATE_PATH, json=request)
        try:
            payload = response.json()
            output = str(payload.get("response", "")).strip()
        except (TypeError, ValueError, json.JSONDecodeError) as error:
            logger.exception(
                "Ollama response JSON parsing failed: model=%s exception_type=%s "
                "exception_message=%s provider_response=%r",
                self._model,
                type(error).__name__,
                str(error),
                response.text[:4_000],
            )
            raise ArchitectProviderError from error

        if not output:
            logger.error(
                "Ollama returned an empty generation response: model=%s provider_response=%r",
                self._model,
                response.text[:4_000],
            )
            raise ArchitectProviderError
        logger.info(
            "Ollama generation response received: model=%s response_characters=%s",
            self._model,
            len(output),
        )
        return output

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> httpx.Response:
        try:
            async with httpx.AsyncClient(base_url=self._base_url, timeout=self._timeout) as client:
                response = await client.request(method, path, json=json)
        except httpx.ConnectError as error:
            self._health_error = f"Ollama is not reachable at {self._base_url}."
            logger.exception(
                "Ollama connection failed: base_url=%s exception_type=%s exception_message=%s",
                self._base_url,
                type(error).__name__,
                str(error),
            )
            raise OllamaUnavailableError from error
        except httpx.TimeoutException as error:
            self._health_error = "Ollama did not respond before the configured timeout."
            logger.exception(
                "Ollama request timed out: base_url=%s path=%s exception_type=%s "
                "exception_message=%s",
                self._base_url,
                path,
                type(error).__name__,
                str(error),
            )
            raise ArchitectTimeoutError from error
        except httpx.HTTPError as error:
            self._health_error = "Ollama returned an unexpected HTTP error."
            logger.exception(
                "Ollama HTTP request failed: base_url=%s path=%s exception_type=%s "
                "exception_message=%s",
                self._base_url,
                path,
                type(error).__name__,
                str(error),
            )
            raise ArchitectProviderError from error

        if response.status_code == 404:
            self._health_error = f"Ollama model {self._model!r} is not installed."
            logger.error(
                "Ollama model is unavailable: model=%s provider_response=%r",
                self._model,
                response.text[:4_000],
            )
            raise OllamaModelUnavailableError
        if response.status_code == 429:
            self._health_error = "Ollama rejected the request because the local server is busy."
            logger.error(
                "Ollama request was rate limited: model=%s provider_response=%r",
                self._model,
                response.text[:4_000],
            )
            raise ArchitectRateLimitError
        if response.is_error:
            self._health_error = "Ollama rejected the generation request."
            logger.error(
                "Ollama generation request failed: model=%s status_code=%s provider_response=%r",
                self._model,
                response.status_code,
                response.text[:4_000],
            )
            raise ArchitectProviderError

        return response

    @staticmethod
    def _validated_json_output(output: str, schema_name: str) -> str:
        """Extract JSON from local-model prose and apply the canonical blueprint validation."""

        extracted = OllamaResponsesClient._extract_json_object(output)
        payload = json.loads(extracted)
        if schema_name == ORGANIZATION_BLUEPRINT_SCHEMA_NAME:
            validate_organization_blueprint(payload)
        return json.dumps(payload)

    @staticmethod
    def _extract_json_object(output: str) -> str:
        """Return the first complete JSON object, ignoring any surrounding model prose."""

        start = output.find("{")
        if start < 0:
            raise json.JSONDecodeError("No JSON object found", output, 0)

        depth = 0
        in_string = False
        escaped = False
        for index in range(start, len(output)):
            character = output[index]
            if in_string:
                if escaped:
                    escaped = False
                elif character == "\\":
                    escaped = True
                elif character == '"':
                    in_string = False
                continue
            if character == '"':
                in_string = True
            elif character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
                if depth == 0:
                    return output[start : index + 1]

        raise json.JSONDecodeError("Unterminated JSON object", output, start)
