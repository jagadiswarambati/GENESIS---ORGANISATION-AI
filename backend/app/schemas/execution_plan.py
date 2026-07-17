from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema


class ExecutionPhase(Schema):
    """One ordered, non-executing department handoff."""

    phase_number: Annotated[int, Field(ge=1, le=32)]
    phase_name: ShortText
    department: ShortText
    objective: LongText
    status: Literal["pending"] = "pending"
    estimated_duration: ShortText
    dependencies: Annotated[list[ShortText], Field(max_length=8)]


class ExecutionPlan(Schema):
    """A deterministic roadmap derived from a validated organization blueprint."""

    phases: Annotated[list[ExecutionPhase], Field(min_length=1, max_length=8)]
