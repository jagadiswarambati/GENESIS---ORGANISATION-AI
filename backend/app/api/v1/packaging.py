from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.packaging import ExportBundle, ProjectPackagingRequest
from app.services.packaging_engine import PackagingEngine

router = APIRouter()


def get_packaging_engine() -> PackagingEngine:
    return PackagingEngine()


@router.post("/packages", response_model=ExportBundle)
async def create_project_package(
    request: ProjectPackagingRequest,
    engine: Annotated[PackagingEngine, Depends(get_packaging_engine)],
) -> ExportBundle:
    """Package an existing workspace without changing its generation or execution state."""

    return engine.package(request)
