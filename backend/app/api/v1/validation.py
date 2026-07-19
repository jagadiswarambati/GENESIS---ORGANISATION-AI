import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.validation import ProjectValidationRequest, ValidationReport
from app.services.validation_engine import ValidationEngine

router = APIRouter()
logger = logging.getLogger(__name__)


def get_validation_engine() -> ValidationEngine:
    return ValidationEngine()


@router.post("/validations", response_model=ValidationReport)
async def validate_project(
    request: ProjectValidationRequest,
    engine: Annotated[ValidationEngine, Depends(get_validation_engine)],
) -> ValidationReport:
    """Inspect an existing workspace package without changing upstream project state."""

    try:
        return engine.validate(request)
    except Exception as error:
        logger.exception(
            "Project validation failed: exception_type=%s exception_message=%s package_id=%s",
            type(error).__name__,
            str(error),
            request.project_package.package_id,
        )
        raise
