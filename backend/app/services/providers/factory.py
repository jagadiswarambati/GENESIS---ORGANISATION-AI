from app.core.config import Settings
from app.core.errors import ExecutionProviderConfigurationError
from app.services.gemini_client import GeminiResponsesClient
from app.services.openai_client import ResponsesClient, create_responses_client
from app.services.providers.base import AIProvider
from app.services.providers.gemini import GeminiProvider
from app.services.providers.mock import MockAIProvider
from app.services.providers.openai import OpenAIProvider


class ProviderFactory:
    """Select the configured execution provider without exposing vendor details to the engine."""

    @staticmethod
    def create(settings: Settings) -> AIProvider:
        if settings.ai_provider == "mock":
            return MockAIProvider()
        if settings.ai_provider == "openai":
            return OpenAIProvider(settings)
        if settings.ai_provider == "gemini":
            return GeminiProvider(settings)
        raise ExecutionProviderConfigurationError

    @staticmethod
    def create_responses_client(settings: Settings) -> ResponsesClient:
        """Select the structured-response client used by the Organization Architect."""

        if settings.ai_provider == "gemini":
            return GeminiResponsesClient(settings)
        return create_responses_client(settings)
