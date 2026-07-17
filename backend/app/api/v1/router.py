from fastapi import APIRouter

from app.api.v1.artifacts import router as artifacts_router
from app.api.v1.architect import router as architect_router
from app.api.v1.collaboration import router as collaboration_router
from app.api.v1.deployment import router as deployment_router
from app.api.v1.execution import router as execution_router
from app.api.v1.execution_planner import router as execution_planner_router
from app.api.v1.packaging import router as packaging_router
from app.api.v1.project_review import router as project_review_router
from app.api.v1.system_health import router as system_health_router
from app.api.v1.task_generator import router as task_generator_router
from app.api.v1.validation import router as validation_router
from app.api.v1.verification import router as verification_router
from app.api.v1.worker_assignment import router as worker_assignment_router
from app.api.v1.workspace import router as workspace_router
from app.api.v1.workflow import router as workflow_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(architect_router)
api_router.include_router(system_health_router)
api_router.include_router(execution_planner_router)
api_router.include_router(execution_router)
api_router.include_router(collaboration_router)
api_router.include_router(artifacts_router)
api_router.include_router(workspace_router)
api_router.include_router(packaging_router)
api_router.include_router(validation_router)
api_router.include_router(verification_router)
api_router.include_router(deployment_router)
api_router.include_router(project_review_router)
api_router.include_router(task_generator_router)
api_router.include_router(worker_assignment_router)
api_router.include_router(workflow_router)
