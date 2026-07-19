from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema
from app.schemas.execution import ProviderHealth

ComponentStatus = Literal[
    "operational",
    "configured",
    "not_configured",
    "unavailable",
    "not_applicable",
]
SystemReadiness = Literal[
    "ready",
    "environment_prerequisites_pending",
    "provider_attention_required",
]
PrerequisiteStatus = Literal["available", "missing", "not_applicable"]


class ComponentHealth(Schema):
    """One safe runtime-health indicator without exposing credentials or internal state."""

    status: ComponentStatus
    summary: LongText
    url: ShortText | None = None


class EnvironmentConfiguration(Schema):
    """Non-secret runtime configuration facts useful during startup diagnosis."""

    environment: ShortText
    frontend_origin: ShortText
    database_url_configured: bool
    redis_url_configured: bool
    openai_api_key_configured: bool
    openai_model: ShortText
    ollama_configured: bool
    ollama_base_url: ShortText
    ollama_model: ShortText


class RuntimePrerequisite(Schema):
    """A development or acceptance-test dependency assessed by the running backend."""

    name: ShortText
    status: PrerequisiteStatus
    required_for: LongText
    summary: LongText


class SystemHealth(Schema):
    """Startup and runtime diagnostics covering the existing Genesis platform surfaces."""

    readiness: SystemReadiness
    backend: ComponentHealth
    frontend: ComponentHealth
    active_ai_provider: ProviderHealth
    environment: EnvironmentConfiguration
    api_connectivity: ComponentHealth
    prerequisites: Annotated[list[RuntimePrerequisite], Field(min_length=1, max_length=8)]
    missing_dependencies: Annotated[list[ShortText], Field(max_length=8)]
    startup_messages: Annotated[list[LongText], Field(max_length=8)]
