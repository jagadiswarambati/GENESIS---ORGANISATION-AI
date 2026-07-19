from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.errors import ExecutionProviderConfigurationError
from app.schemas.execution import ExecutionRequest, ExecutionResult, ProviderHealth
from app.services.execution_engine import ExecutionEngineService
from app.services.organization_memory import OrganizationMemoryService
from app.services.providers.factory import ProviderFactory
from app.services.workflow_engine import WorkflowEngineService

router = APIRouter()


def get_execution_engine_service() -> ExecutionEngineService:
    return ExecutionEngineService(
        ProviderFactory.create(settings),
        WorkflowEngineService(),
        OrganizationMemoryService(),
    )


@router.get("/execution-provider/health", response_model=ProviderHealth)
async def get_execution_provider_health() -> ProviderHealth:
    """Report the configured provider without exposing credentials or failing the application."""

    provider_id = settings.ai_provider
    try:
        provider = ProviderFactory.create(settings)
    except ExecutionProviderConfigurationError as error:
        provider_name = "Unavailable provider"
        if provider_id == "mock":
            provider_name = "Mock AI"
        elif provider_id == "openai":
            provider_name = "OpenAI"
        elif provider_id == "gemini":
            provider_name = "Gemini"
        elif provider_id == "ollama":
            provider_name = "Ollama"
        return ProviderHealth(
            provider_id=provider_id,
            provider_name=provider_name,
            is_healthy=False,
            error=error.message,
        )

    is_healthy = await provider.health_check()
    health_error = getattr(provider, "health_error", None)
    return ProviderHealth(
        provider_id=provider_id,
        provider_name="Mock AI" if provider_id == "mock" else provider.provider_name,
        is_healthy=is_healthy,
        error=health_error if not is_healthy else None,
    )


@router.post("/executions", response_model=ExecutionResult)
async def execute_ready_tasks(
    request: ExecutionRequest,
    service: Annotated[ExecutionEngineService, Depends(get_execution_engine_service)],
) -> ExecutionResult:
    """Execute only Ready tasks through the configured provider implementation."""

    return await service.execute_ready_tasks(request)
