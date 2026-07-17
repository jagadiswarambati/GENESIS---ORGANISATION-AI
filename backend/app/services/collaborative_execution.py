from app.core.config import Settings
from app.schemas.collaboration import CollaborativeExecutionRequest, CollaborativeExecutionResult
from app.services.collaboration_engine import CollaborationEngine
from app.services.execution_engine import ExecutionEngineService
from app.services.organization_memory import OrganizationMemoryService
from app.services.providers.collaborative import CollaborativeAIProvider
from app.services.providers.factory import ProviderFactory
from app.services.workflow_engine import WorkflowEngineService


class CollaborativeExecutionService:
    """Compose collaboration around the unchanged execution engine and provider interface."""

    def __init__(self, settings: Settings, collaboration_engine: CollaborationEngine) -> None:
        self._settings = settings
        self._collaboration_engine = collaboration_engine

    async def execute_ready_tasks(
        self,
        request: CollaborativeExecutionRequest,
    ) -> CollaborativeExecutionResult:
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
        execution_engine = ExecutionEngineService(
            provider,
            WorkflowEngineService(),
            OrganizationMemoryService(),
        )
        execution_result = await execution_engine.execute_ready_tasks(request.execution_request)
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
