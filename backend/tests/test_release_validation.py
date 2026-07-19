"""Release-validation coverage for Genesis' production workflow and failure boundaries."""

import asyncio
import json
from collections.abc import Iterator
from time import perf_counter
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import architect as architect_api
from app.api.v1 import execution as execution_api
from app.core.config import Settings
from app.core.errors import ExecutionProviderConfigurationError
from app.main import app
from app.schemas.architect import (
    OrganizationBlueprint,
    OrganizationDepartment,
    OrganizationDna,
    OrganizationRole,
)
from app.schemas.memory import OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker
from app.services.gemini_client import GeminiResponsesClient
from app.services.ollama_client import OllamaResponsesClient
from app.services.providers.factory import ProviderFactory
from app.services.providers.gemini import GeminiProvider
from app.services.providers.mock import MockAIProvider
from app.services.providers.ollama import OllamaProvider
from app.services.providers.openai import OpenAIProvider
from app.services.review_providers.factory import ProjectReviewProviderFactory
from app.services.review_providers.gemini import GeminiProjectReviewProvider
from app.services.review_providers.ollama import OllamaProjectReviewProvider


class StaticArchitectService:
    """Deterministic Architect replacement independent of a live API key."""

    async def create_blueprint(self, _: str) -> OrganizationBlueprint:
        departments = [
            ("Research", "Establish the product and technology evidence base."),
            ("Backend Engineering", "Design reliable services and API contracts."),
            ("Frontend Engineering", "Deliver the web application experience."),
            ("Quality Assurance", "Verify the primary user and integration flows."),
            ("Operations", "Prepare the project for reliable deployment."),
            ("Marketing", "Prepare the product launch narrative."),
        ]
        return OrganizationBlueprint(
            organization_name="Genesis Health Platform",
            organization_type="Healthcare software company",
            mission_summary="Build a secure AI-powered hospital operations platform.",
            suggested_culture="Regulated Operations",
            dna=OrganizationDna(
                speed=60,
                quality=95,
                creativity=55,
                security=95,
                collaboration=85,
            ),
            departments=[
                OrganizationDepartment(
                    name=name,
                    mandate=mandate,
                    roles=[
                        OrganizationRole(
                            name=f"{name} Lead",
                            responsibility=f"Lead the {name.lower()} responsibilities.",
                            worker_count=1,
                        )
                    ],
                )
                for name, mandate in departments
            ],
            execution_strategy=(
                "Sequence evidence, engineering, quality, operations, and launch work."
            ),
            worker_capacity=12,
            estimated_duration="6 weeks",
            risks=["Clinical safety review is required before production use."],
            deliverables=["Validated, packaged, and deployment-ready software project."],
            confidence_score=92,
        )


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    app.dependency_overrides[architect_api.get_organization_architect_service] = (
        StaticArchitectService
    )
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def post_json(client: TestClient, path: str, payload: object) -> dict[str, object]:
    response = client.post(path, json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def workflow_metrics(client: TestClient) -> dict[str, float]:
    timings: dict[str, float] = {}
    started_at = perf_counter()
    blueprint = post_json(
        client,
        "/api/v1/architect",
        "/api/v1/system-health",
        {"mission": "Build a secure AI-powered hospital operations platform."},
    )
    timings["mission_creation_and_architecture"] = perf_counter() - started_at

    started_at = perf_counter()
    plan = post_json(client, "/api/v1/execution-plans", blueprint)
    timings["execution_planning"] = perf_counter() - started_at

    started_at = perf_counter()
    task_groups = post_json(client, "/api/v1/task-groups", plan)
    timings["task_generation"] = perf_counter() - started_at
    assert task_groups

    started_at = perf_counter()
    assignments = post_json(client, "/api/v1/worker-assignments", task_groups)
    workflow = post_json(client, "/api/v1/workflows", task_groups)
    timings["worker_assignment_and_workflow"] = perf_counter() - started_at
    assert any(state["status"] == "ready" for state in workflow["task_states"])
    assert any(state["status"] == "blocked" for state in workflow["task_states"])

    health = client.get("/api/v1/execution-provider/health")
    assert health.status_code == 200
    assert health.json() == {
        "provider_id": "mock",
        "provider_name": "Mock AI",
        "is_healthy": True,
        "error": None,
    }

    organization_memory: dict[str, object] = {"entries": []}
    artifacts: list[dict[str, object]] = []
    collaboration_session: dict[str, object] | None = None
    total_tasks = sum(len(group["tasks"]) for group in task_groups)
    completed_tasks = 0
    execution_duration = 0.0
    artifact_duration = 0.0

    while completed_tasks < total_tasks:
        started_at = perf_counter()
        collaboration_result = post_json(
            client,
            "/api/v1/collaborative-executions",
            {
                "execution_request": {
                    "workflow": workflow,
                    "task_groups": task_groups,
                    "worker_assignment_result": assignments,
                    "organization_memory": organization_memory,
                },
                "artifact_collection": {"artifacts": artifacts},
                "collaboration_session": collaboration_session,
            },
        )
        execution_duration += perf_counter() - started_at
        execution_result = collaboration_result["execution_result"]
        workflow = execution_result["workflow"]
        organization_memory = execution_result["organization_memory"]
        collaboration_session = collaboration_result["collaboration_session"]
        executions = execution_result["executions"]
        assert executions
        assert all(execution["status"] == "completed" for execution in executions)
        assert all(
            any("Loaded" in log["message"] for log in execution["execution_logs"])
            for execution in executions
        )

        started_at = perf_counter()
        artifact_result = post_json(
            client,
            "/api/v1/artifacts",
            {
                "execution_result": execution_result,
                "task_groups": task_groups,
                "worker_assignment_result": assignments,
            },
        )
        artifact_duration += perf_counter() - started_at
        artifacts.extend(artifact_result["artifact_collection"]["artifacts"])
        organization_memory = artifact_result["organization_memory"]
        completed_tasks = sum(state["status"] == "completed" for state in workflow["task_states"])

    timings["mock_execution"] = execution_duration
    timings["artifact_generation"] = artifact_duration
    assert len(artifacts) == 4
    assert collaboration_session is not None
    assert collaboration_session["conversations"]
    assert organization_memory["entries"]

    started_at = perf_counter()
    workspace_result = post_json(
        client,
        "/api/v1/workspaces",
        {
            "project_name": blueprint["organization_name"],
            "artifact_collection": {"artifacts": artifacts},
            "organization_memory": organization_memory,
        },
    )
    timings["workspace_generation"] = perf_counter() - started_at
    workspace = workspace_result["workspace"]
    organization_memory = workspace_result["organization_memory"]
    assert workspace["build_status"] == "ready"

    manifest_context = {
        "mission_summary": blueprint["mission_summary"],
        "organization_summary": blueprint["organization_type"],
        "departments": [department["name"] for department in blueprint["departments"]],
        "generated_workers": [worker["worker_name"] for worker in assignments["workers"]],
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "generated_artifacts": len(artifacts),
    }
    started_at = perf_counter()
    export_bundle = post_json(
        client,
        "/api/v1/packages",
        {"workspace": workspace, "manifest_context": manifest_context},
    )
    timings["packaging"] = perf_counter() - started_at
    package = export_bundle["project_package"]
    included_files = export_bundle["included_files"]
    assert "backend/requirements.txt" in included_files
    assert "frontend/package.json" in included_files
    assert "frontend/tsconfig.json" in included_files
    assert "frontend/app/page.tsx" in included_files

    validation_payload = {
        "workspace": workspace,
        "artifact_collection": {"artifacts": artifacts},
        "task_groups": task_groups,
        "workflow": workflow,
        "worker_assignment_result": assignments,
        "project_package": package,
        "package_included_files": included_files,
    }
    started_at = perf_counter()
    validation = post_json(client, "/api/v1/validations", validation_payload)
    timings["validation"] = perf_counter() - started_at
    assert validation["health"]["critical_issues"] == 0

    started_at = perf_counter()
    verification = post_json(
        client,
        "/api/v1/verifications",
        {
            "workspace": workspace,
            "project_package": package,
            "package_included_files": included_files,
        },
    )
    timings["verification"] = perf_counter() - started_at
    assert verification["sandbox_run"]["status"] == "passed"

    started_at = perf_counter()
    review = post_json(
        client,
        "/api/v1/project-reviews",
        {
            "workspace": workspace,
            "artifact_collection": {"artifacts": artifacts},
            "organization_memory": organization_memory,
            "validation_report": validation,
            "verification_report": verification,
            "project_package": package,
            "package_included_files": included_files,
        },
    )
    timings["review_generation"] = perf_counter() - started_at
    assert review["suggestions"]

    selected_suggestion = review["suggestions"][0]
    refinement = post_json(
        client,
        "/api/v1/project-reviews/refinements",
        {
            "project_review": review,
            "selected_suggestion_ids": [selected_suggestion["suggestion_id"]],
            "workspace": workspace,
            "artifact_collection": {"artifacts": artifacts},
            "organization_memory": organization_memory,
        },
    )
    assert refinement["refinement_request"]["status"] == "applied"
    assert refinement["project_review"]["suggestions"][0]["status"] == "resolved"

    updated_by_id = {artifact["artifact_id"]: artifact for artifact in artifacts}
    for artifact in refinement["artifact_collection"]["artifacts"]:
        updated_by_id[artifact["artifact_id"]] = artifact
    artifacts = list(updated_by_id.values())
    organization_memory = refinement["organization_memory"]
    workspace_result = post_json(
        client,
        "/api/v1/workspaces",
        {
            "project_name": blueprint["organization_name"],
            "artifact_collection": {"artifacts": artifacts},
            "organization_memory": organization_memory,
            "existing_workspace": workspace,
        },
    )
    workspace = workspace_result["workspace"]
    organization_memory = workspace_result["organization_memory"]
    export_bundle = post_json(
        client,
        "/api/v1/packages",
        {"workspace": workspace, "manifest_context": manifest_context},
    )
    package = export_bundle["project_package"]
    included_files = export_bundle["included_files"]

    started_at = perf_counter()
    deployment = post_json(
        client,
        "/api/v1/deployments",
        {
            "project_package": package,
            "package_manifest": export_bundle["manifest"],
            "package_included_files": included_files,
        },
    )
    timings["deployment_generation"] = perf_counter() - started_at
    assert deployment["status"] == "ready"
    assert deployment["health_checks"]

    return timings


def test_complete_mock_provider_release_workflow(client: TestClient) -> None:
    metrics = workflow_metrics(client)
    assert all(duration >= 0 for duration in metrics.values())
    for stage, duration in sorted(metrics.items()):
        print(f"RELEASE_METRIC {stage}={duration * 1000:.2f}ms")


def test_provider_factory_and_provider_contracts() -> None:
    mock_settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="mock",
    )
    assert isinstance(ProviderFactory.create(mock_settings), MockAIProvider)

    missing_key_settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="openai",
        OPENAI_API_KEY=None,
    )
    with pytest.raises(ExecutionProviderConfigurationError):
        ProviderFactory.create(missing_key_settings)

    missing_gemini_key_settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="gemini",
        gemini_api_key=None,
    )
    with pytest.raises(ExecutionProviderConfigurationError):
        ProviderFactory.create(missing_gemini_key_settings)

    openai_settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="openai",
        OPENAI_API_KEY="release-validation-key",
        openai_model="gpt-5.6",
    )
    provider = OpenAIProvider(openai_settings)

    class StubModels:
        async def retrieve(self, _: str) -> object:
            return object()

    class StubResponses:
        async def create(self, **_: object) -> SimpleNamespace:
            return SimpleNamespace(
                output_text="def generated_endpoint() -> str:\n    return 'ok'\n"
            )

    provider._client = SimpleNamespace(models=StubModels(), responses=StubResponses())
    assert asyncio.run(provider.health_check()) is True
    execution = asyncio.run(
        provider.execute_task(
            Task(
                task_id="release-validation-task",
                task_name="Build APIs",
                description="Implement a typed API boundary.",
                department="Backend Engineering",
                phase_id=1,
                priority="high",
                estimated_duration="1 day",
                dependencies=[],
            ),
            AIWorker(
                worker_id="backend-engineer",
                worker_name="Backend Engineer",
                role="Backend Engineer",
                department="Backend Engineering",
                assigned_tasks=["release-validation-task"],
                capabilities=["API development"],
            ),
            OrganizationMemory(entries=[]),
        )
    )
    assert execution.status == "completed"
    assert execution.artifact_content is not None
    assert "generated_endpoint" in execution.artifact_content

    gemini_settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="gemini",
        GEMINI_API_KEY="release-validation-key",
        gemini_model="gemini-2.5-flash",
    )
    gemini_provider = ProviderFactory.create(gemini_settings)
    assert isinstance(gemini_provider, GeminiProvider)
    assert isinstance(
        ProjectReviewProviderFactory.create(gemini_settings), GeminiProjectReviewProvider
    )
    responses_client = ProviderFactory.create_responses_client(gemini_settings)
    assert isinstance(responses_client, GeminiResponsesClient)

    class StubGeminiModels:
        async def get(self, *, model: str) -> object:
            assert model == "gemini-2.5-flash"
            return object()

        async def generate_content(self, **_: object) -> SimpleNamespace:
            return SimpleNamespace(text=json.dumps({"status": "ok"}))

    class StubGeminiInteractions:
        async def create(self, **_: object) -> SimpleNamespace:
            return SimpleNamespace(output_text=json.dumps({"status": "ok"}))

    responses_client._client = SimpleNamespace(
        models=StubGeminiModels(),
        interactions=StubGeminiInteractions(),
    )
    assert asyncio.run(responses_client.health_check()) is True
    assert (
        asyncio.run(
            responses_client.create_json(
                input_text="Return the requested object.",
                instructions="Return only JSON.",
                schema={"type": "object"},
                schema_name="release_validation",
            )
        )
        == '{"status": "ok"}'
    )

    gemini_provider._responses_client._client = SimpleNamespace(models=StubGeminiModels())
    assert asyncio.run(gemini_provider.health_check()) is True
    gemini_execution = asyncio.run(
        gemini_provider.execute_task(
            Task(
                task_id="gemini-release-validation-task",
                task_name="Build APIs",
                description="Implement a typed API boundary.",
                department="Backend Engineering",
                phase_id=1,
                priority="high",
                estimated_duration="1 day",
                dependencies=[],
            ),
            AIWorker(
                worker_id="backend-engineer",
                worker_name="Backend Engineer",
                role="Backend Engineer",
                department="Backend Engineering",
                assigned_tasks=["gemini-release-validation-task"],
                capabilities=["API development"],
            ),
            OrganizationMemory(entries=[]),
        )
    )
    assert gemini_execution.status == "completed"

    ollama_settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="ollama",
        ollama_base_url="http://localhost:11434",
        ollama_model="llama3.2:3b",
    )
    ollama_provider = ProviderFactory.create(ollama_settings)
    assert isinstance(ollama_provider, OllamaProvider)
    assert isinstance(
        ProjectReviewProviderFactory.create(ollama_settings), OllamaProjectReviewProvider
    )
    ollama_client = ProviderFactory.create_responses_client(ollama_settings)
    assert isinstance(ollama_client, OllamaResponsesClient)

    blueprint = asyncio.run(StaticArchitectService().create_blueprint("Ollama validation mission"))
    raw_blueprint = json.dumps(blueprint.model_dump(mode="json"))
    extracted = OllamaResponsesClient._validated_json_output(
        f"Here is the blueprint:\n```json\n{raw_blueprint}\n```",
        "organization_blueprint",
    )
    assert OrganizationBlueprint.model_validate_json(extracted) == blueprint


def test_openai_missing_key_health_is_graceful(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    missing_key_settings = Settings(
        database_url="postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
        ai_provider="openai",
        OPENAI_API_KEY=None,
    )
    monkeypatch.setattr(execution_api, "settings", missing_key_settings)
    response = client.get("/api/v1/execution-provider/health")
    assert response.status_code == 200
    assert response.json()["is_healthy"] is False
    assert "API key" in response.json()["error"]


@pytest.mark.parametrize(
    ("path", "payload", "message"),
    [
        (
            "/api/v1/architect",
            {"mission": "short"},
            "Organization Architect requires a mission of at least 10 characters.",
        ),
        (
            "/api/v1/workspaces",
            {"project_name": "Missing artifacts", "organization_memory": {"entries": []}},
            "Project Workspace requires generated artifacts and organization memory.",
        ),
        (
            "/api/v1/packages",
            {"manifest_context": {}},
            "Project Packaging requires a completed workspace and manifest context.",
        ),
        (
            "/api/v1/deployments",
            {"package_included_files": []},
            "Deployment Generation requires a completed project package and manifest.",
        ),
    ],
)
def test_invalid_inputs_return_user_friendly_errors(
    client: TestClient,
    path: str,
    payload: dict[str, object],
    message: str,
) -> None:
    response = client.post(path, json=payload)
    assert response.status_code == 422
    assert response.json() == {"code": "invalid_request", "message": message}


def test_validation_and_verification_report_failures_without_crashing(client: TestClient) -> None:
    blueprint = StaticArchitectService()
    architecture = asyncio.run(blueprint.create_blueprint("Release validation mission"))
    workspace = post_json(
        client,
        "/api/v1/workspaces",
        {
            "project_name": architecture.organization_name,
            "artifact_collection": {"artifacts": []},
            "organization_memory": {"entries": []},
        },
    )["workspace"]
    package = post_json(
        client,
        "/api/v1/packages",
        {
            "workspace": workspace,
            "manifest_context": {
                "mission_summary": architecture.mission_summary,
                "organization_summary": architecture.organization_type,
                "departments": [],
                "generated_workers": [],
                "total_tasks": 0,
                "completed_tasks": 0,
                "generated_artifacts": 0,
            },
        },
    )
    validation = post_json(
        client,
        "/api/v1/validations",
        {
            "workspace": workspace,
            "artifact_collection": {"artifacts": []},
            "task_groups": [],
            "project_package": package["project_package"],
            "package_included_files": [],
        },
    )
    assert validation["health"]["status"] == "needs_review"
    assert validation["issues"]

    verification = post_json(
        client,
        "/api/v1/verifications",
        {
            "workspace": workspace,
            "project_package": package["project_package"],
            "package_included_files": [],
        },
    )
    assert verification["sandbox_run"]["status"] == "failed"
    assert verification["sandbox_run"]["exit_code"] == 1


def test_scaffold_package_is_foundation_verified(client: TestClient) -> None:
    blueprint = StaticArchitectService()
    architecture = asyncio.run(blueprint.create_blueprint("Foundation verification mission"))
    workspace = post_json(
        client,
        "/api/v1/workspaces",
        {
            "project_name": architecture.organization_name,
            "artifact_collection": {"artifacts": []},
            "organization_memory": {"entries": []},
        },
    )["workspace"]
    package = post_json(
        client,
        "/api/v1/packages",
        {
            "workspace": workspace,
            "manifest_context": {
                "mission_summary": architecture.mission_summary,
                "organization_summary": architecture.organization_type,
                "departments": [],
                "generated_workers": [],
                "total_tasks": 0,
                "completed_tasks": 0,
                "generated_artifacts": 0,
            },
        },
    )

    verification = post_json(
        client,
        "/api/v1/verifications",
        {
            "workspace": workspace,
            "project_package": package["project_package"],
            "package_included_files": package["included_files"],
        },
    )

    backend = next(
        result for result in verification["build_results"] if result["target"] == "Backend"
    )
    assert verification["sandbox_run"]["status"] == "passed"
    assert verification["sandbox_run"]["build_status"] == "passed"
    assert verification["sandbox_run"]["test_status"] == "pending"
    assert verification["sandbox_run"]["implementation_level"] == "foundation"
    assert verification["sandbox_run"]["exit_code"] == 0
    assert backend["status"] == "pending"
    assert backend["pending_checks"] == 1
    assert backend["failed_checks"] == 0
    assert any(log.startswith("PENDING:") for log in backend["build_logs"])


def test_all_expected_api_routes_are_registered() -> None:
    paths = {route.path for route in app.routes}
    assert {
        "/api/v1/architect",
        "/api/v1/execution-plans",
        "/api/v1/task-groups",
        "/api/v1/worker-assignments",
        "/api/v1/workflows",
        "/api/v1/collaborative-executions",
        "/api/v1/artifacts",
        "/api/v1/workspaces",
        "/api/v1/packages",
        "/api/v1/validations",
        "/api/v1/verifications",
        "/api/v1/project-reviews",
        "/api/v1/project-reviews/refinements",
        "/api/v1/deployments",
    }.issubset(paths)


def test_system_health_reports_runtime_prerequisites(client: TestClient) -> None:
    response = client.get("/api/v1/system-health")
    assert response.status_code == 200
    health = response.json()
    assert health["backend"]["status"] == "operational"
    assert health["frontend"]["status"] == "configured"
    assert health["active_ai_provider"]["provider_id"] == "mock"
    assert health["api_connectivity"]["status"] in {
        "operational",
        "not_configured",
        "unavailable",
    }
    assert health["prerequisites"]
    assert health["startup_messages"]
