from datetime import datetime
from typing import Annotated

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.base import Schema


class MemoryEntry(Schema):
    """One durable execution output available to future organization workers."""

    memory_id: ShortText
    task_id: ShortText
    worker_id: ShortText
    department: ShortText
    title: ShortText
    summary: LongText
    content: LongText
    timestamp: datetime
    tags: Annotated[list[ShortText], Field(min_length=1, max_length=8)]


class OrganizationMemory(Schema):
    """Shared organization knowledge, separate from workflow and execution state."""

    entries: Annotated[list[MemoryEntry], Field(max_length=256)]
