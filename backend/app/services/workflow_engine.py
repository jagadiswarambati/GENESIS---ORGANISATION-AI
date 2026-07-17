from hashlib import sha256

from app.schemas.task_generator import TaskGroup
from app.schemas.workflow import Workflow, WorkflowTaskState


class WorkflowEngineService:
    """Coordinate task readiness from dependencies without executing any task."""

    def create_workflow(self, task_groups: list[TaskGroup]) -> Workflow:
        """Initialize a workflow, then derive Ready and Blocked task states."""

        task_states = [
            WorkflowTaskState(
                task_id=task.task_id,
                status="pending",
                dependencies=task.dependencies,
                blocked_by=[],
            )
            for group in task_groups
            for task in group.tasks
        ]
        task_ids = ":".join(state.task_id for state in task_states)
        workflow = Workflow(
            workflow_id=f"workflow-{sha256(task_ids.encode()).hexdigest()[:12]}",
            task_states=task_states,
        )
        return self.refresh_workflow(workflow)

    def refresh_workflow(self, workflow: Workflow) -> Workflow:
        """Promote dependency-satisfied tasks to Ready and retain terminal states."""

        states_by_task_id = {state.task_id: state for state in workflow.task_states}
        refreshed_states: list[WorkflowTaskState] = []

        for state in workflow.task_states:
            if state.status in {"completed", "failed", "running"}:
                refreshed_states.append(state.model_copy(update={"blocked_by": []}))
                continue

            blocked_by = [
                dependency
                for dependency in state.dependencies
                if states_by_task_id.get(dependency, None) is None
                or states_by_task_id[dependency].status != "completed"
            ]
            refreshed_states.append(
                state.model_copy(
                    update={"status": "blocked" if blocked_by else "ready", "blocked_by": blocked_by}
                )
            )

        return workflow.model_copy(update={"task_states": refreshed_states})
