import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import ArchitectError, ExecutionProviderError, ProjectReviewError
from app.schemas.errors import ApiError
from app.services.system_health import SystemHealthService

logger = logging.getLogger(__name__)

REQUEST_VALIDATION_MESSAGES = {
    "/api/v1/architect": "Organization Architect requires a mission of at least 10 characters.",
    "/api/v1/workspaces": "Project Workspace requires generated artifacts and organization memory.",
    "/api/v1/packages": "Project Packaging requires a completed workspace and manifest context.",
    "/api/v1/validations": (
        "Project Validation requires the workspace, artifacts, package, and package file list."
    ),
    "/api/v1/verifications": "Project Verification requires a completed workspace and package.",
    "/api/v1/project-reviews": (
        "Project Review requires workspace, artifacts, organization memory, "
        "and current quality reports."
    ),
    "/api/v1/project-reviews/refinements": (
        "Selective refinement requires a current review, selected suggestions, "
        "and project artifacts."
    ),
    "/api/v1/deployments": (
        "Deployment Generation requires a completed project package and manifest."
    ),
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Emit non-secret prerequisite diagnostics before Genesis begins serving requests."""

    diagnostics = SystemHealthService(settings)
    for message in diagnostics.startup_messages():
        logger.warning("Genesis startup diagnostic: %s", message)
    yield


app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ArchitectError)
async def handle_architect_error(_: Request, error: ArchitectError) -> JSONResponse:
    payload = ApiError(code=error.code, message=error.message)
    return JSONResponse(status_code=error.status_code, content=payload.model_dump())


@app.exception_handler(ExecutionProviderError)
async def handle_execution_provider_error(
    _: Request, error: ExecutionProviderError
) -> JSONResponse:
    logger.error(
        "Genesis execution provider error: exception_type=%s exception_message=%s",
        type(error).__name__,
        str(error),
        exc_info=(type(error), error, error.__traceback__),
    )
    payload = ApiError(code=error.code, message=error.message)
    return JSONResponse(status_code=error.status_code, content=payload.model_dump())


@app.exception_handler(ProjectReviewError)
async def handle_project_review_error(_: Request, error: ProjectReviewError) -> JSONResponse:
    payload = ApiError(code=error.code, message=error.message)
    return JSONResponse(status_code=error.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(
    request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    logger.warning(
        "Genesis request validation failed: path=%s validation_errors=%s",
        request.url.path,
        error.errors(),
    )
    payload = ApiError(
        code="invalid_request",
        message=REQUEST_VALIDATION_MESSAGES.get(
            request.url.path,
            "Genesis could not process the request. Review the submitted data and try again.",
        ),
    )
    return JSONResponse(status_code=422, content=payload.model_dump())


app.include_router(api_router)
