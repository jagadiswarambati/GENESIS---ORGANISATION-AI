import asyncio
import logging
from json import JSONDecodeError

from pydantic import ValidationError

from app.core.config import Settings
from app.core.errors import CollaborativeExecutionDeferredError
from app.schemas.collaboration import CollaborativeExecutionRequest, CollaborativeExecutionResult
from app.services.collaboration_engine import CollaborationEngine
from app.services.execution_engine import ExecutionEngineService
from app.services.organization_memory import OrganizationMemoryService
from app.services.providers.collaborative import CollaborativeAIProvider
from app.services.providers.factory import ProviderFactory
from app.services.workflow_engine import WorkflowEngineService

logger = logging.getLogger(__name__)


class CollaborativeExecutionService:
    """Compose collaboration around the unchanged execution engine and provider interface."""

    def __init__(self, settings: Settings, collaboration_engine: CollaborationEngine) -> None:
        self._settings = settings
        self._collaboration_engine = collaboration_engine

    async def execute_ready_tasks(
        self,
        request: CollaborativeExecutionRequest,
    ) -> CollaborativeExecutionResult:
        provider_name = self._settings.ai_provider
        ready_task_count = sum(
            state.status == "ready" for state in request.execution_request.workflow.task_states
        )
        try:
            session = request.collaboration_session or self._collaboration_engine.create_session()
            phase_names = {
                group.phase_id: group.phase_name for group in request.execution_request.task_groups
            }
            provider = CollaborativeAIProvider(
                ProviderFactory.create(self._settings),
                self._collaboration_engine,
                session,
                request.artifact_collection,
                phase_names,
            )
            provider_name = provider.provider_name
            execution_engine = ExecutionEngineService(
                provider,
                WorkflowEngineService(),
                OrganizationMemoryService(),
            )
            try:
                async with asyncio.timeout(self._settings.collaborative_execution_timeout_seconds):
                    execution_result = await execution_engine.execute_ready_tasks(
                        request.execution_request
                    )
            except TimeoutError as error:
                logger.warning(
                    "Collaborative execution timed out: provider=%s timeout_seconds=%s "
                    "ready_task_count=%s artifact_count=%s memory_entry_count=%s",
                    provider_name,
                    self._settings.collaborative_execution_timeout_seconds,
                    ready_task_count,
                    len(request.artifact_collection.artifacts),
                    len(request.execution_request.organization_memory.entries),
                    exc_info=error,
                )
                raise CollaborativeExecutionDeferredError from error

            updated_memory = self._collaboration_engine.store_memory_references(
                execution_result.organization_memory,
                provider.collaboration_session,
            )
            return CollaborativeExecutionResult(
                execution_result=execution_result.model_copy(
                    update={"organization_memory": updated_memory}
                ),
                collaboration_session=provider.collaboration_session,
            )
        except CollaborativeExecutionDeferredError:
            raise
        except JSONDecodeError:
            logger.exception(
                "Collaborative execution JSON parsing failed: provider=%s ready_task_count=%s",
                provider_name,
                ready_task_count,
            )
            raise
        except ValidationError as error:
            logger.exception(
                "Collaborative execution validation failed: provider=%s ready_task_count=%s "
                "validation_errors=%s",
                provider_name,
                ready_task_count,
                error.errors(),
            )
            raise
        except Exception as error:
            logger.exception(
                "Collaborative execution failed: provider=%s ready_task_count=%s "
                "exception_type=%s exception_message=%s",
                provider_name,
                ready_task_count,
                type(error).__name__,
                str(error),
            )
            raise
