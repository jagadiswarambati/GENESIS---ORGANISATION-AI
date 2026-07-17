from dataclasses import dataclass

from app.schemas.execution_plan import ExecutionPhase, ExecutionPlan
from app.schemas.task_generator import Task, TaskGroup, TaskPriority


@dataclass(frozen=True)
class TaskTemplate:
    name: str
    description: str
    priority: TaskPriority
    duration: str


class TaskGeneratorService:
    """Create deterministic task backlogs from execution phases without assigning work."""

    _TEMPLATES: dict[str, tuple[TaskTemplate, ...]] = {
        "research": (
            TaskTemplate("Analyze Market", "Assess market opportunity.", "high", "1 day"),
            TaskTemplate("Study Competitors", "Identify competing offerings.", "high", "1 day"),
            TaskTemplate("Identify Target Users", "Document user groups.", "medium", "1 day"),
            TaskTemplate("Research Technology Stack", "Evaluate options.", "medium", "1 day"),
            TaskTemplate("Define Success Metrics", "Propose measurable outcomes.", "low", "1 day"),
        ),
        "strategy": (
            TaskTemplate("Define Product Vision", "Set product direction.", "high", "1 day"),
            TaskTemplate("Prioritize Features", "Rank mission capabilities.", "high", "1 day"),
            TaskTemplate("Create Product Roadmap", "Sequence delivery work.", "medium", "1 day"),
            TaskTemplate("Define MVP Scope", "Set the first release scope.", "medium", "1 day"),
        ),
        "design": (
            TaskTemplate("Map User Flows", "Outline user journeys.", "high", "1 day"),
            TaskTemplate("Information Architecture", "Organize navigation.", "high", "1 day"),
            TaskTemplate("Create Interface Direction", "Set direction.", "medium", "1 day"),
            TaskTemplate("Prepare Design Handoff", "Document decisions.", "medium", "1 day"),
        ),
        "engineering": (
            TaskTemplate("Set Up Repository", "Prepare workspace structure.", "high", "1 day"),
            TaskTemplate("Design Backend", "Define service boundaries.", "high", "1 day"),
            TaskTemplate("Design Database", "Plan data models.", "high", "1 day"),
            TaskTemplate("Build APIs", "Implement service interfaces.", "medium", "2 days"),
            TaskTemplate("Build Frontend", "Implement product interface.", "medium", "2 days"),
            TaskTemplate("Integration Testing", "Verify component boundaries.", "low", "1 day"),
        ),
        "quality": (
            TaskTemplate("Define Test Strategy", "Set acceptance coverage.", "high", "1 day"),
            TaskTemplate("Validate Core Flows", "Review primary flows.", "high", "1 day"),
            TaskTemplate("Document Findings", "Record risks and defects.", "medium", "1 day"),
        ),
        "operations": (
            TaskTemplate("Prepare Operating Checklist", "Define handoff.", "high", "1 day"),
            TaskTemplate("Review Readiness", "Confirm operational readiness.", "high", "1 day"),
            TaskTemplate("Document Handoff", "Capture operating information.", "medium", "1 day"),
        ),
        "marketing": (
            TaskTemplate("Define Audience Positioning", "Set positioning.", "high", "1 day"),
            TaskTemplate("Plan Launch Narrative", "Prepare core message.", "high", "1 day"),
            TaskTemplate("Select Launch Channels", "Identify channels.", "medium", "1 day"),
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

    def create_task_groups(self, execution_plan: ExecutionPlan) -> list[TaskGroup]:
        """Generate every phase's task backlog from fixed department templates."""

        return [self._create_group(phase) for phase in execution_plan.phases]

    def _create_group(self, phase: ExecutionPhase) -> TaskGroup:
        templates = self._TEMPLATES.get(self._template_key(phase), self._fallback_templates(phase))
        tasks: list[Task] = []

        for index, template in enumerate(templates, start=1):
            task_id = f"phase-{phase.phase_number}-task-{index}"
            dependencies = [tasks[-1].task_id] if tasks else []
            tasks.append(
                Task(
                    task_id=task_id,
                    task_name=template.name,
                    description=template.description,
                    department=phase.department,
                    phase_id=phase.phase_number,
                    priority=template.priority,
                    estimated_duration=template.duration,
                    dependencies=dependencies,
                )
            )

        return TaskGroup(
            phase_id=phase.phase_number,
            phase_name=phase.phase_name,
            department=phase.department,
            tasks=tasks,
        )

    def _template_key(self, phase: ExecutionPhase) -> str:
        searchable_text = f"{phase.phase_name} {phase.department} {phase.objective}".lower()
        for template_key, keywords in self._DEPARTMENT_KEYWORDS:
            if any(keyword in searchable_text for keyword in keywords):
                return template_key
        return "fallback"

    @staticmethod
    def _fallback_templates(phase: ExecutionPhase) -> tuple[TaskTemplate, ...]:
        return (
            TaskTemplate(
                f"Review {phase.phase_name} Objective",
                f"Review the phase objective: {phase.objective}",
                "high",
                "1 working day",
            ),
            TaskTemplate(
                f"Define {phase.phase_name} Approach",
                "Outline the approach required to complete this department phase.",
                "medium",
                "1 working day",
            ),
            TaskTemplate(
                f"Prepare {phase.phase_name} Handoff",
                "Document the outcomes required by the next execution phase.",
                "low",
                "1 working day",
            ),
        )
