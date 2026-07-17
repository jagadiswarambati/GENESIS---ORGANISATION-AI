from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.verification import ProjectVerificationRequest, VerificationReport
from app.services.verification_engine import VerificationEngine

router = APIRouter()


def get_verification_engine() -> VerificationEngine:
    return VerificationEngine()


@router.post("/verifications", response_model=VerificationReport)
async def verify_project(
    request: ProjectVerificationRequest,
    engine: Annotated[VerificationEngine, Depends(get_verification_engine)],
) -> VerificationReport:
    """Safely verify an existing project package without executing its generated code."""

    return engine.verify(request)
