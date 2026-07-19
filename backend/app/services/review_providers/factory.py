from app.core.config import Settings
from app.core.errors import ProjectReviewConfigurationError
from app.services.review_providers.base import ProjectReviewProvider
from app.services.review_providers.gemini import GeminiProjectReviewProvider
from app.services.review_providers.mock import DeterministicProjectReviewProvider
from app.services.review_providers.ollama import OllamaProjectReviewProvider
from app.services.review_providers.openai import OpenAIProjectReviewProvider


class ProjectReviewProviderFactory:
    """Select the review provider without coupling review orchestration to a vendor SDK."""

    @staticmethod
    def create(settings: Settings) -> ProjectReviewProvider:
        if settings.ai_provider == "mock":
            return DeterministicProjectReviewProvider()
        if settings.ai_provider == "openai":
            return OpenAIProjectReviewProvider(settings)
        if settings.ai_provider == "gemini":
            return GeminiProjectReviewProvider(settings)
        if settings.ai_provider == "ollama":
            return OllamaProjectReviewProvider(settings)
        raise ProjectReviewConfigurationError
