from dataclasses import dataclass

from app.schemas.task_generator import Task, TaskGroup
from app.schemas.worker_assignment import AIWorker, WorkerAssignment, WorkerAssignmentResult


@dataclass(frozen=True)
class WorkerTemplate:
    role: str
    capabilities: tuple[str, ...]
    avatar_icon: str


class WorkerAssignmentService:
    """Assign waiting workers using deterministic department and task-name rules."""

    _WORKERS: dict[str, tuple[WorkerTemplate, ...]] = {
        "research": (
            WorkerTemplate("Research Analyst", ("market analysis", "research"), "search"),
        ),
        "strategy": (
            WorkerTemplate("Product Strategist", ("product strategy", "roadmapping"), "target"),
        ),
        "design": (
            WorkerTemplate("UI/UX Designer", ("user flows", "interface design"), "palette"),
        ),
        "engineering": (
            WorkerTemplate("Backend Engineer", ("service design", "API development"), "server"),
            WorkerTemplate("Frontend Engineer", ("interface", "integration"), "monitor"),
            WorkerTemplate("Database Engineer", ("data modeling", "database"), "database"),
        ),
        "quality": (
            WorkerTemplate("QA Engineer", ("test strategy", "quality validation"), "check-circle"),
        ),
        "operations": (
            WorkerTemplate("DevOps Engineer", ("operational readiness", "deployment"), "settings"),
        ),
        "marketing": (
            WorkerTemplate("Marketing Strategist", ("positioning", "launch planning"), "megaphone"),
        ),
        "fallback": (
            WorkerTemplate("Department Specialist", ("department planning",), "sparkles"),
        ),
    }

    _DEPARTMENT_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
        ("research", ("research", "insight", "analysis", "discovery", "data")),
        ("strategy", ("strategy", "product", "planning", "program")),
        ("design", ("design", "experience", "ux", "creative")),
        (
            "engineering",
            ("engineering", "development", "technology", "frontend", "backend", "platform"),
        ),
        ("quality", ("quality", "assurance", "qa", "test", "validation", "compliance")),
        ("operations", ("operations", "delivery", "deployment", "support", "security")),
        ("marketing", ("marketing", "growth", "sales", "communications", "brand")),
    )

    def create_assignments(self, task_groups: list[TaskGroup]) -> WorkerAssignmentResult:
        """Build a worker roster and task mappings without changing the source tasks."""

        workers_by_id: dict[str, AIWorker] = {}
        assignments: list[WorkerAssignment] = []

        for group in task_groups:
            department_key = self._department_key(group)
            for task in group.tasks:
                worker = self._get_or_create_worker(workers_by_id, department_key, task, group)
                workers_by_id[worker.worker_id] = worker.model_copy(
                    update={"assigned_tasks": [*worker.assigned_tasks, task.task_id]}
                )
                assignments.append(
                    WorkerAssignment(task_id=task.task_id, worker_id=worker.worker_id)
                )

        return WorkerAssignmentResult(workers=list(workers_by_id.values()), assignments=assignments)

    def _get_or_create_worker(
        self,
        workers_by_id: dict[str, AIWorker],
        department_key: str,
        task: Task,
        group: TaskGroup,
    ) -> AIWorker:
        template = self._worker_template(department_key, task)
        worker_id = f"{department_key}-{self._slug(template.role)}"
        existing_worker = workers_by_id.get(worker_id)
        if existing_worker:
            return existing_worker

        return AIWorker(
            worker_id=worker_id,
            worker_name=template.role,
            role=template.role,
            department=group.department,
            assigned_tasks=[],
            capabilities=list(template.capabilities),
            avatar_icon=template.avatar_icon,
        )

    def _worker_template(self, department_key: str, task: Task) -> WorkerTemplate:
        templates = self._WORKERS[department_key]
        if department_key != "engineering":
            return templates[0]

        task_text = f"{task.task_name} {task.description}".lower()
        if "database" in task_text or "data model" in task_text:
            return templates[2]
        if "frontend" in task_text or "interface" in task_text:
            return templates[1]
        return templates[0]

    def _department_key(self, group: TaskGroup) -> str:
        searchable_text = f"{group.phase_name} {group.department}".lower()
        for key, keywords in self._DEPARTMENT_KEYWORDS:
            if any(keyword in searchable_text for keyword in keywords):
                return key
        return "fallback"

    @staticmethod
    def _slug(value: str) -> str:
        return "-".join(value.lower().replace("/", " ").split())
