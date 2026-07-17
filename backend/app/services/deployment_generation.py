import json
from datetime import datetime, timezone
from hashlib import sha256

from app.schemas.deployment import (
    DeploymentAsset,
    DeploymentEnvironmentVariable,
    DeploymentGenerationRequest,
    DeploymentPlan,
    DeploymentRecommendation,
    HealthCheck,
    RuntimeRequirement,
)

REQUIRED_RUNTIME_FILES = ("Dockerfile", "docker-compose.yml", ".env.example")


class DeploymentGenerationService:
    """Generate a deployment overlay without changing project generation."""

    def generate(self, request: DeploymentGenerationRequest) -> DeploymentPlan:
        """Create production runtime assets, recommendations, and configuration guidance."""

        created_at = datetime.now(timezone.utc)
        included_files = set(request.package_included_files)
        assets = self._deployment_assets(request, included_files)
        missing_runtime_files = [
            file_path for file_path in REQUIRED_RUNTIME_FILES if file_path not in included_files
        ]
        missing_configuration = [
            "Set production values for DATABASE_URL and POSTGRES_PASSWORD.",
            "Set the public backend URL through NEXT_PUBLIC_API_BASE_URL.",
            "Set GENESIS_FRONTEND_ORIGIN to the deployed frontend URL.",
        ]
        if missing_runtime_files:
            missing_configuration.append(
                "Package did not include "
                f"{', '.join(missing_runtime_files)}; Genesis generated an overlay."
            )

        return DeploymentPlan(
            deployment_id=self._deployment_id(request.project_package.package_id, created_at),
            package_id=request.project_package.package_id,
            created_at=created_at,
            status="ready",
            runtime_status="configuration_required",
            runtime_configuration_summary=(
                "Containerized web runtime prepared for a Next.js frontend, FastAPI backend, "
                "and PostgreSQL database. Apply production environment values before release."
            ),
            runtime_requirements=self._runtime_requirements(),
            required_environment_variables=self._environment_variables(),
            deployment_assets=assets,
            health_checks=self._health_checks(),
            deployment_recommendations=self._recommendations(),
            missing_configuration=missing_configuration,
            source_workspace_id=request.project_package.source_workspace_id,
            source_workspace_updated_at=request.project_package.source_workspace_updated_at,
        )

    def _deployment_assets(
        self,
        request: DeploymentGenerationRequest,
        included_files: set[str],
    ) -> list[DeploymentAsset]:
        manifest_payload = {
            "project_name": request.project_package.project_name,
            "package_id": request.project_package.package_id,
            "mission_summary": request.package_manifest.mission_summary,
            "runtime": "nextjs-fastapi-postgresql",
            "health_checks": ["/health", "/api/health"],
        }
        return [
            self._asset(
                "Dockerfile",
                "Container build definition for the backend runtime.",
                included_files,
                self._dockerfile_content(),
            ),
            self._asset(
                "docker-compose.yml",
                "Local and production-like multi-service runtime definition.",
                included_files,
                self._compose_content(),
            ),
            self._asset(
                ".env.example",
                "Template for runtime configuration values.",
                included_files,
                self._environment_template(),
            ),
            DeploymentAsset(
                file_path="README.md#production-deployment",
                status="generated",
                description="Production deployment section to append to the generated README.",
                content=self._readme_deployment_section(request.project_package.project_name),
            ),
            DeploymentAsset(
                file_path="backend/health.py",
                status="generated",
                description="FastAPI health endpoint module for the deployment overlay.",
                content=self._health_endpoint_module(),
            ),
            DeploymentAsset(
                file_path="frontend/app/api/health/route.ts",
                status="generated",
                description="Next.js health endpoint module for the deployment overlay.",
                content=self._frontend_health_route(),
            ),
            DeploymentAsset(
                file_path="deployment/manifest.json",
                status="generated",
                description="Machine-readable deployment manifest for runtime automation.",
                content=json.dumps(manifest_payload, indent=2, sort_keys=True),
            ),
        ]

    @staticmethod
    def _asset(
        file_path: str,
        description: str,
        included_files: set[str],
        content: str,
    ) -> DeploymentAsset:
        if file_path in included_files:
            return DeploymentAsset(
                file_path=file_path,
                status="provided",
                description=f"{description} Already included in the project package.",
            )
        return DeploymentAsset(
            file_path=file_path,
            status="generated",
            description=description,
            content=content,
        )

    @staticmethod
    def _runtime_requirements() -> list[RuntimeRequirement]:
        return [
            RuntimeRequirement(
                name="Node.js",
                version="20+",
                purpose="Build and serve the Next.js frontend.",
            ),
            RuntimeRequirement(
                name="Python",
                version="3.12+",
                purpose="Run the FastAPI backend with Uvicorn.",
            ),
            RuntimeRequirement(
                name="PostgreSQL",
                version="16+",
                purpose="Persist application and organization data.",
            ),
            RuntimeRequirement(
                name="Docker Compose",
                version="v2+",
                purpose="Coordinate frontend, backend, database, and cache services.",
            ),
        ]

    @staticmethod
    def _environment_variables() -> list[DeploymentEnvironmentVariable]:
        return [
            DeploymentEnvironmentVariable(
                name="DATABASE_URL",
                description="Production PostgreSQL connection URL used by the backend.",
                example="postgresql+asyncpg://genesis:change-me@db:5432/genesis",
            ),
            DeploymentEnvironmentVariable(
                name="POSTGRES_PASSWORD",
                description="Password for the managed PostgreSQL runtime.",
                example="change-me",
            ),
            DeploymentEnvironmentVariable(
                name="NEXT_PUBLIC_API_BASE_URL",
                description="Public URL consumed by the frontend when calling the backend API.",
                example="https://api.example.com",
            ),
            DeploymentEnvironmentVariable(
                name="GENESIS_FRONTEND_ORIGIN",
                description="Allowed production origin for backend CORS configuration.",
                example="https://app.example.com",
            ),
        ]

    @staticmethod
    def _health_checks() -> list[HealthCheck]:
        return [
            HealthCheck(
                service="Backend API",
                endpoint="/health",
                status="generated",
                description="Generated FastAPI router reports backend liveness and readiness.",
            ),
            HealthCheck(
                service="Frontend",
                endpoint="/api/health",
                status="generated",
                description="Generated Next.js route reports frontend runtime availability.",
            ),
            HealthCheck(
                service="Database",
                endpoint=None,
                status="generated",
                description=(
                    "Compose health checks use PostgreSQL readiness "
                    "before backend startup."
                ),
            ),
        ]

    @staticmethod
    def _recommendations() -> list[DeploymentRecommendation]:
        return [
            DeploymentRecommendation(
                target="frontend",
                recommendation=(
                    "Deploy the Next.js frontend to Vercel, Cloudflare Pages, "
                    "or a Node container."
                ),
                rationale=(
                    "These runtimes support static delivery, edge caching, "
                    "and public environment variables."
                ),
            ),
            DeploymentRecommendation(
                target="backend",
                recommendation=(
                    "Deploy the FastAPI service as a Docker container on Fly.io, Railway, "
                    "Render, or Kubernetes."
                ),
                rationale=(
                    "Container platforms provide predictable Uvicorn runtime configuration "
                    "and health probes."
                ),
            ),
            DeploymentRecommendation(
                target="database",
                recommendation=(
                    "Use managed PostgreSQL from Neon, Supabase, AWS RDS, "
                    "or a private container runtime."
                ),
                rationale=(
                    "Managed backups, encryption, and connection pooling "
                    "reduce operational risk."
                ),
            ),
        ]

    @staticmethod
    def _dockerfile_content() -> str:
        return (
            "FROM python:3.12-slim\n"
            "WORKDIR /app\n"
            "COPY backend /app/backend\n"
            "CMD [\"python\", \"-m\", \"uvicorn\", \"backend.app:app\", "
            "\"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n"
        )

    @staticmethod
    def _compose_content() -> str:
        return (
            "services:\n"
            "  backend:\n"
            "    build: .\n"
            "    env_file: .env\n"
            "    ports:\n"
            "      - \"8000:8000\"\n"
            "    depends_on:\n"
            "      db:\n"
            "        condition: service_healthy\n"
            "  db:\n"
            "    image: postgres:16\n"
            "    env_file: .env\n"
            "    healthcheck:\n"
            "      test: [\"CMD-SHELL\", \"pg_isready -U genesis -d genesis\"]\n"
        )

    @staticmethod
    def _environment_template() -> str:
        return (
            "DATABASE_URL=postgresql+asyncpg://genesis:change-me@db:5432/genesis\n"
            "POSTGRES_PASSWORD=change-me\n"
            "NEXT_PUBLIC_API_BASE_URL=https://api.example.com\n"
            "GENESIS_FRONTEND_ORIGIN=https://app.example.com\n"
        )

    @staticmethod
    def _frontend_health_route() -> str:
        return (
            "export function GET(): Response {\n"
            "  return Response.json({ status: 'ok' });\n"
            "}\n"
        )

    @staticmethod
    def _readme_deployment_section(project_name: str) -> str:
        return (
            "## Production Deployment\n\n"
            f"{project_name} ships with a deployment overlay for a Next.js frontend, "
            "FastAPI backend, and PostgreSQL database. Configure the values in `.env`, then deploy "
            "the services through "
            "your selected container or managed runtime.\n"
        )

    @staticmethod
    def _health_endpoint_module() -> str:
        return (
            "from fastapi import APIRouter\n\n"
            "router = APIRouter()\n\n"
            "@router.get(\"/health\")\n"
            "async def health_check() -> dict[str, str]:\n"
            "    return {\"status\": \"ok\"}\n"
        )

    @staticmethod
    def _deployment_id(package_id: str, created_at: datetime) -> str:
        source = f"{package_id}:{created_at.isoformat()}"
        return f"deployment-{sha256(source.encode()).hexdigest()[:12]}"
