import re
from dataclasses import dataclass

from app.schemas.task_generator import Task


@dataclass(frozen=True)
class ArtifactProfile:
    """Deterministic file metadata inferred from an already-generated task."""

    artifact_type: str
    description: str
    extension: str


def artifact_profile_for(task: Task) -> ArtifactProfile:
    """Return one project-file shape for a task without changing the task itself."""

    department = task.department.lower()
    task_name = task.task_name.lower()

    if "research" in department:
        if "competitor" in task_name:
            return ArtifactProfile("Competitor Analysis (.md)", "A competitor analysis.", ".md")
        if "requirement" in task_name:
            return ArtifactProfile(
                "Requirements Specification (.md)", "A requirements specification.", ".md"
            )
        return ArtifactProfile("Market Research Report (.md)", "A market research report.", ".md")
    if "strategy" in department or "product" in department:
        if "roadmap" in task_name or "mvp" in task_name:
            return ArtifactProfile("MVP Roadmap (.md)", "An MVP roadmap.", ".md")
        return ArtifactProfile("Product Vision (.md)", "A product vision document.", ".md")
    if "design" in department:
        if "component" in task_name:
            return ArtifactProfile(
                "Component Structure (.md)", "A component structure document.", ".md"
            )
        return ArtifactProfile("UI Specification (.md)", "A UI specification.", ".md")
    if "backend" in department or (
        "engineering" in department and "frontend" not in task_name
    ):
        if "database" in task_name or "model" in task_name:
            return ArtifactProfile("Database Models (.py)", "Database model source code.", ".py")
        if "schema" in task_name or "sql" in task_name:
            return ArtifactProfile("SQL Schema (.sql)", "A database schema.", ".sql")
        if "route" in task_name or "api" in task_name:
            return ArtifactProfile("FastAPI Routes (.py)", "FastAPI route source code.", ".py")
        return ArtifactProfile("Python Source Code (.py)", "Backend Python source code.", ".py")
    if "frontend" in department:
        if "style" in task_name or "tailwind" in task_name or "css" in task_name:
            return ArtifactProfile(
                "CSS / Tailwind Components (.tsx)", "A styled UI component.", ".tsx"
            )
        if "type" in task_name:
            return ArtifactProfile("TypeScript Files (.ts)", "A TypeScript module.", ".ts")
        return ArtifactProfile("React Components (.tsx)", "A React component.", ".tsx")
    if "qa" in department or "quality" in department:
        if "test plan" in task_name:
            return ArtifactProfile("Test Plan (.md)", "A test plan.", ".md")
        return ArtifactProfile("Test Cases (.py)", "Pytest test cases.", ".py")
    if "operation" in department or "devops" in department:
        if "deploy" in task_name:
            return ArtifactProfile("Deployment Files (.yml)", "A deployment configuration.", ".yml")
        return ArtifactProfile("Docker Configuration (.yml)", "A Docker configuration.", ".yml")
    if "marketing" in department:
        if "pitch" in task_name:
            return ArtifactProfile("Product Pitch (.md)", "A product pitch.", ".md")
        return ArtifactProfile("Launch Strategy (.md)", "A launch strategy.", ".md")
    return ArtifactProfile("Project Brief (.md)", "A project task brief.", ".md")


def artifact_name_for(task: Task, profile: ArtifactProfile) -> str:
    """Build a stable human-readable filename from the task name."""

    slug = re.sub(r"[^a-z0-9]+", "-", task.task_name.lower()).strip("-")
    return f"{slug or task.task_id}{profile.extension}"
