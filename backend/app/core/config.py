from functools import lru_cache

from pydantic import Field, PostgresDsn, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings sourced from the environment."""

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        env_prefix="GENESIS_",
        extra="ignore",
    )

    app_name: str = "Genesis"
    app_description: str = "Build Organizations. Not Prompts."
    app_version: str = "0.1.0"
    environment: str = "development"

    database_url: PostgresDsn
    redis_url: str = "redis://localhost:6379/0"
    frontend_origin: str = "http://localhost:3001"

    # OpenAI Configuration
    openai_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="OPENAI_API_KEY",
    )
    openai_model: str = "gpt-5.6"

    # Gemini Configuration
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.5-flash"

    # Ollama Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    # Active AI Provider
    ai_provider: str = "gemini"

    # Collaborative execution is background enrichment and must never hold Mission Control open.
    collaborative_execution_timeout_seconds: float = 90.0

    @property
    def has_openai_api_key(self) -> bool:
        """Return whether a non-empty OpenAI API key is available."""

        return bool(self.openai_api_key and self.openai_api_key.get_secret_value().strip())

    @property
    def has_gemini_api_key(self) -> bool:
        """Return whether a non-empty Gemini API key is available."""

        return bool(self.gemini_api_key and self.gemini_api_key.get_secret_value().strip())

    @property
    def has_ollama(self) -> bool:
        """Return whether the local Ollama endpoint and selected model are configured."""

        return bool(self.ollama_base_url.strip() and self.ollama_model.strip())

    @field_validator("ollama_base_url")
    @classmethod
    def validate_ollama_base_url(cls, value: str) -> str:
        """Require an HTTP endpoint while allowing host-specific local development URLs."""

        normalized = value.strip().rstrip("/")
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("ollama_base_url must start with http:// or https://")
        return normalized


@lru_cache
def get_settings() -> Settings:
    """Create one immutable settings instance per process."""
    return Settings()


settings = get_settings()
