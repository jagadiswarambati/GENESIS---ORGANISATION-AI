from typing import Annotated

from pydantic import Field

from app.schemas.base import Schema

ShortText = Annotated[str, Field(min_length=1, max_length=240)]
LongText = Annotated[str, Field(min_length=1, max_length=1200)]


class ArchitectRequest(Schema):
    mission: Annotated[str, Field(min_length=10, max_length=2000)]


class OrganizationDna(Schema):
    collaboration: Annotated[int, Field(ge=0, le=100)]
    creativity: Annotated[int, Field(ge=0, le=100)]
    quality: Annotated[int, Field(ge=0, le=100)]
    security: Annotated[int, Field(ge=0, le=100)]
    speed: Annotated[int, Field(ge=0, le=100)]


class OrganizationRole(Schema):
    name: ShortText
    responsibility: LongText
    worker_count: Annotated[int, Field(ge=1, le=12)]


class OrganizationDepartment(Schema):
    mandate: LongText
    name: ShortText
    roles: Annotated[list[OrganizationRole], Field(min_length=1, max_length=8)]


class OrganizationBlueprint(Schema):
    confidence_score: Annotated[int, Field(ge=0, le=100)]
    departments: Annotated[list[OrganizationDepartment], Field(min_length=1, max_length=8)]
    deliverables: Annotated[list[ShortText], Field(min_length=1, max_length=8)]
    dna: OrganizationDna
    estimated_duration: ShortText
    execution_strategy: LongText
    mission_summary: LongText
    organization_name: ShortText
    organization_type: ShortText
    risks: Annotated[list[ShortText], Field(min_length=1, max_length=8)]
    suggested_culture: ShortText
    worker_capacity: Annotated[int, Field(ge=1, le=64)]
