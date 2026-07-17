from app.schemas.execution import ExecutionRequest, ExecutionResult, WorkerExecution
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.schemas.workflow import Workflow
from app.services.providers.base import AIProvider
from app.services.organization_memory import OrganizationMemoryService
from app.services.workflow_engine import WorkflowEngineService


class ExecutionEngineService:
    """Execute only Ready workflow tasks through an injected AI provider."""

    def __init__(
        self,
        provider: AIProvider,
        workflow_engine: WorkflowEngineService,
        memory_service: OrganizationMemoryService,
    ) -> None:
        self._provider = provider
        self._workflow_engine = workflow_engine
        self._memory_service = memory_service

    async def execute_ready_tasks(self, request: ExecutionRequest) -> ExecutionResult:
        """Run the current Ready set, then delegate readiness refresh to the workflow engine."""

        tasks_by_id = {
            task.task_id: task for group in request.task_groups for task in group.tasks
        }
        workers_by_id = {
            worker.worker_id: worker for worker in request.worker_assignment_result.workers
        }
        worker_by_task_id = {
            assignment.task_id: workers_by_id.get(assignment.worker_id)
            for assignment in request.worker_assignment_result.assignments
        }
        ready_task_ids = [
            state.task_id for state in request.workflow.task_states if state.status == "ready"
        ]
        workflow = self._with_running_tasks(request.workflow, ready_task_ids)
        executions: list[WorkerExecution] = []
        organization_memory = request.organization_memory

        for task_id in ready_task_ids:
            task = tasks_by_id.get(task_id)
            worker = worker_by_task_id.get(task_id)
            if task is None or worker is None:
                continue

            execution = await self._provider.execute_task(task, worker, organization_memory)
            executions.append(execution)
            organization_memory = self._memory_service.record_completed_execution(
                organization_memory,
                execution,
                task,
                worker,
                self._provider.provider_name,
            )

        workflow = self._with_execution_states(workflow, executions)
        return ExecutionResult(
            provider_name=self._provider.provider_name,
            executions=executions,
            workflow=self._workflow_engine.refresh_workflow(workflow),
            organization_memory=organization_memory,
        )

    @staticmethod
    def _with_running_tasks(workflow: Workflow, task_ids: list[str]) -> Workflow:
        return workflow.model_copy(
            update={
                "task_states": [
                    state.model_copy(update={"status": "running", "blocked_by": []})
                    if state.task_id in task_ids
                    else state
                    for state in workflow.task_states
                ]
            }
        )

    @staticmethod
    def _with_execution_states(workflow: Workflow, executions: list[WorkerExecution]) -> Workflow:
        status_by_task_id = {execution.task_id: execution.status for execution in executions}
        return workflow.model_copy(
            update={
                "task_states": [
                    state.model_copy(
                        update={"status": status_by_task_id[state.task_id], "blocked_by": []}
                    )
                    if state.task_id in status_by_task_id
                    else state
                    for state in workflow.task_states
                ]
            }
        )
