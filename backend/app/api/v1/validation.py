from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.validation import ProjectValidationRequest, ValidationReport
from app.services.validation_engine import ValidationEngine

router = APIRouter()


def get_validation_engine() -> ValidationEngine:
    return ValidationEngine()


@router.post("/validations", response_model=ValidationReport)
async def validate_project(
    request: ProjectValidationRequest,
    engine: Annotated[ValidationEngine, Depends(get_validation_engine)],
) -> ValidationReport:
    """Inspect an existing workspace package without changing upstream project state."""

    return engine.validate(request)
