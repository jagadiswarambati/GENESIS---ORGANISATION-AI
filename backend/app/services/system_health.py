from importlib.util import find_spec
from shutil import which
from sys import executable

from app.core.config import Settings
from app.core.errors import ExecutionProviderConfigurationError
from app.schemas.execution import ProviderHealth
from app.schemas.system_health import (
    ComponentHealth,
    EnvironmentConfiguration,
    RuntimePrerequisite,
    SystemHealth,
    SystemReadiness,
)
from app.services.providers.factory import ProviderFactory
from app.services.providers.openai import OpenAIProvider


class SystemHealthService:
    """Describe existing runtime prerequisites without changing execution or project state."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def get_health(self) -> SystemHealth:
        """Return a non-secret readiness report for the configured provider."""

        prerequisites = self._prerequisites()
        missing_dependencies = [item.name for item in prerequisites if item.status == "missing"]
        provider_health = await self._provider_health()
        api_connectivity = await self._api_connectivity(provider_health)
        startup_messages = self.startup_messages(missing_dependencies, provider_health)
        readiness = self._readiness(missing_dependencies, provider_health)

        return SystemHealth(
            readiness=readiness,
            backend=ComponentHealth(
                status="operational",
                summary="FastAPI backend is serving the System Health endpoint.",
            ),
            frontend=ComponentHealth(
                status="configured",
                summary="Frontend origin is configured for Genesis browser clients.",
                url=self._settings.frontend_origin,
            ),
            active_ai_provider=provider_health,
            environment=EnvironmentConfiguration(
                environment=self._settings.environment,
                frontend_origin=self._settings.frontend_origin,
                database_url_configured=bool(str(self._settings.database_url)),
                redis_url_configured=bool(self._settings.redis_url),
                openai_api_key_configured=self._settings.has_openai_api_key,
                openai_model=self._settings.openai_model,
            ),
            api_connectivity=api_connectivity,
            prerequisites=prerequisites,
            missing_dependencies=missing_dependencies,
            startup_messages=startup_messages,
        )

    def startup_messages(
        self,
        missing_dependencies: list[str] | None = None,
        provider_health: ProviderHealth | None = None,
    ) -> list[str]:
        """Return actionable startup messages without making an external API request."""

        missing_dependencies = (
            missing_dependencies
            if missing_dependencies is not None
            else [item.name for item in self._prerequisites() if item.status == "missing"]
        )
        messages: list[str] = []
        if missing_dependencies:
            messages.append(
                "Release checks are pending: install "
                f"{', '.join(missing_dependencies)} to run Ruff and pytest."
            )
        if self._settings.ai_provider == "gemini" and not self._settings.has_gemini_api_key:
            messages.append(
                "Gemini-backed Organization Architect missions require GEMINI_API_KEY. "
                "Mock execution remains available."
            )
        elif not self._settings.has_openai_api_key:
            messages.append(
                "OpenAI acceptance tests and Organization Architect missions "
                "require OPENAI_API_KEY. "
                "Mock execution remains available."
            )
        if provider_health is not None and not provider_health.is_healthy:
            messages.append(
                provider_health.error
                or "The selected AI provider needs attention before ready tasks can execute."
            )
        if not messages:
            messages.append("Genesis startup diagnostics completed successfully.")
        return messages

    async def _provider_health(self) -> ProviderHealth:
        provider_id = self._settings.ai_provider
        try:
            provider = ProviderFactory.create(self._settings)
        except ExecutionProviderConfigurationError as error:
            return ProviderHealth(
                provider_id=provider_id,
                provider_name=self._provider_name(provider_id),
                is_healthy=False,
                error=error.message,
            )

        is_healthy = await provider.health_check()
        health_error = getattr(provider, "health_error", None)
        return ProviderHealth(
            provider_id=provider_id,
            provider_name=("Mock AI" if provider_id == "mock" else provider.provider_name),
            is_healthy=is_healthy,
            error=health_error if not is_healthy else None,
        )

    async def _api_connectivity(self, provider_health: ProviderHealth) -> ComponentHealth:
        if self._settings.ai_provider == "gemini":
            if not self._settings.has_gemini_api_key:
                return ComponentHealth(
                    status="not_configured",
                    summary=(
                        "Gemini API connectivity is not checked because GEMINI_API_KEY "
                        "is not configured."
                    ),
                )
            return self._connectivity_from_provider(provider_health)

        if not self._settings.has_openai_api_key:
            return ComponentHealth(
                status="not_configured",
                summary=(
                    "OpenAI Responses API connectivity is not checked because OPENAI_API_KEY "
                    "is not configured."
                ),
            )
        if self._settings.ai_provider == "openai":
            return self._connectivity_from_provider(provider_health)

        provider = OpenAIProvider(self._settings)
        is_healthy = await provider.health_check()
        return ComponentHealth(
            status="operational" if is_healthy else "unavailable",
            summary=(
                f"OpenAI Responses API is reachable for model {self._settings.openai_model}."
                if is_healthy
                else (provider.health_error or "OpenAI Responses API is unavailable.")
            ),
        )

    @staticmethod
    def _connectivity_from_provider(provider_health: ProviderHealth) -> ComponentHealth:
        return ComponentHealth(
            status="operational" if provider_health.is_healthy else "unavailable",
            summary=(
                "Configured AI provider credentials and model metadata are reachable."
                if provider_health.is_healthy
                else (provider_health.error or "Configured AI provider is unavailable.")
            ),
        )

    def _prerequisites(self) -> list[RuntimePrerequisite]:
        return [
            RuntimePrerequisite(
                name="Python",
                status="available" if executable else "missing",
                required_for="Running the FastAPI backend and backend release checks.",
                summary="Python runtime is active for the Genesis backend.",
            ),
            RuntimePrerequisite(
                name="uv",
                status="available" if which("uv") else "missing",
                required_for="Synchronizing backend development and test dependencies.",
                summary=(
                    "uv is available for backend dependency management."
                    if which("uv")
                    else "Install uv to run the backend release-validation workflow."
                ),
            ),
            RuntimePrerequisite(
                name="Ruff",
                status="available" if which("ruff") else "missing",
                required_for="Running Python lint and format checks before release.",
                summary=(
                    "Ruff is available for backend code-quality checks."
                    if which("ruff")
                    else "Install Ruff to run backend lint and format validation."
                ),
            ),
            RuntimePrerequisite(
                name="pytest",
                status="available" if find_spec("pytest") else "missing",
                required_for="Running API-level end-to-end and release-validation tests.",
                summary=(
                    "pytest is available for backend release-validation tests."
                    if find_spec("pytest")
                    else "Install pytest to run the Mock-provider end-to-end suite."
                ),
            ),
        ]

    def _readiness(
        self,
        missing_dependencies: list[str],
        provider_health: ProviderHealth,
    ) -> SystemReadiness:
        if not provider_health.is_healthy:
            return "provider_attention_required"
        if missing_dependencies or not self._has_active_provider_key():
            return "environment_prerequisites_pending"
        return "ready"

    def _has_active_provider_key(self) -> bool:
        if self._settings.ai_provider == "gemini":
            return self._settings.has_gemini_api_key
        return self._settings.has_openai_api_key

    def _provider_name(self, provider_id: str) -> str:
        if provider_id == "mock":
            return "Mock AI"
        if provider_id == "openai":
            return f"OpenAI {self._settings.openai_model}"
        if provider_id == "gemini":
            return f"Gemini {self._settings.gemini_model}"
        return "Unavailable provider"
