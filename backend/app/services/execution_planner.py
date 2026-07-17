from app.schemas.architect import OrganizationBlueprint, OrganizationDepartment
from app.schemas.execution_plan import ExecutionPhase, ExecutionPlan


class ExecutionPlannerService:
    """Build a provider-independent order of department work without executing it."""

    _STAGE_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
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

    def create_plan(self, blueprint: OrganizationBlueprint) -> ExecutionPlan:
        """Order supplied departments while preserving each department's existing mandate."""

        ordered_departments = sorted(
            enumerate(blueprint.departments),
            key=lambda item: (self._stage_index(item[1]), item[0]),
        )
        phases: list[ExecutionPhase] = []

        for index, (_, department) in enumerate(ordered_departments, start=1):
            dependency = [phases[-1].phase_name] if phases else []
            phases.append(
                ExecutionPhase(
                    phase_number=index,
                    phase_name=department.name,
                    department=department.name,
                    objective=department.mandate,
                    estimated_duration=self._estimated_duration(department),
                    dependencies=dependency,
                )
            )

        return ExecutionPlan(phases=phases)

    def _stage_index(self, department: OrganizationDepartment) -> int:
        searchable_text = f"{department.name} {department.mandate}".lower()
        for index, (_, keywords) in enumerate(self._STAGE_KEYWORDS):
            if any(keyword in searchable_text for keyword in keywords):
                return index
        return len(self._STAGE_KEYWORDS)

    @staticmethod
    def _estimated_duration(department: OrganizationDepartment) -> str:
        working_days = min(max(len(department.roles), 1), 5)
        day_label = "day" if working_days == 1 else "days"
        return f"{working_days} working {day_label}"
