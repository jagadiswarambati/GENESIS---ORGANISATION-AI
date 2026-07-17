from functools import lru_cache

from pydantic import Field, PostgresDsn, SecretStr
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
    gemini_model: str = "gemini-2.5-flash"

    # Active AI Provider
    ai_provider: str = "gemini"

    @property
    def has_openai_api_key(self) -> bool:
        """Return whether a non-empty OpenAI API key is available."""

        return bool(
            self.openai_api_key
            and self.openai_api_key.get_secret_value().strip()
        )

    @property
    def has_gemini_api_key(self) -> bool:
        """Return whether a non-empty Gemini API key is available."""

        return bool(
            self.gemini_api_key
            and self.gemini_api_key.get_secret_value().strip()
        )


@lru_cache
def get_settings() -> Settings:
    """Create one immutable settings instance per process."""
    return Settings()


settings = get_settings()