from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema


TaskPriority = Literal["high", "medium", "low"]


class Task(Schema):
    """One actionable, non-executing unit of work within an execution phase."""

    task_id: ShortText
    task_name: ShortText
    description: LongText
    department: ShortText
    phase_id: Annotated[int, Field(ge=1, le=32)]
    priority: TaskPriority
    estimated_duration: ShortText
    status: Literal["pending"] = "pending"
    dependencies: Annotated[list[ShortText], Field(max_length=12)]


class TaskGroup(Schema):
    """The generated task backlog for one execution phase."""

    phase_id: Annotated[int, Field(ge=1, le=32)]
    phase_name: ShortText
    department: ShortText
    tasks: Annotated[list[Task], Field(min_length=1, max_length=8)]
