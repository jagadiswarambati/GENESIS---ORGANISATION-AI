import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.verification import ProjectVerificationRequest, VerificationReport
from app.services.verification_engine import VerificationEngine

router = APIRouter()
logger = logging.getLogger(__name__)


def get_verification_engine() -> VerificationEngine:
    return VerificationEngine()


@router.post("/verifications", response_model=VerificationReport)
async def verify_project(
    request: ProjectVerificationRequest,
    engine: Annotated[VerificationEngine, Depends(get_verification_engine)],
) -> VerificationReport:
    """Safely verify an existing project package without executing its generated code."""

    try:
        return engine.verify(request)
    except Exception as error:
        logger.exception(
            "Project verification failed: exception_type=%s exception_message=%s package_id=%s",
            type(error).__name__,
            str(error),
            request.project_package.package_id,
        )
        raise
