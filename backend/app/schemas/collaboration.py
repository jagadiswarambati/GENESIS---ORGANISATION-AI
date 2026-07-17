from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.architect import LongText, ShortText
from app.schemas.artifact import ArtifactCollection, MissionArtifact
from app.schemas.base import Schema
from app.schemas.execution import ExecutionRequest, ExecutionResult
from app.schemas.memory import OrganizationMemory

ConversationMessageType = Literal[
    "suggestion",
    "question",
    "answer",
    "decision",
    "review_request",
    "review_response",
    "information",
    "warning",
]
CollaborationStage = Literal["before_execution", "during_execution", "after_execution"]


class ConversationMessage(Schema):
    """One attributable worker-to-worker collaboration record."""

    message_id: ShortText
    session_id: ShortText
    sender_worker_id: ShortText
    sender_department: ShortText
    receiver_worker_id: ShortText | None = None
    related_task_id: ShortText
    message_type: ConversationMessageType
    content: LongText
    timestamp: datetime


class WorkerConversation(Schema):
    """A phase-scoped, chronological thread of worker messages."""

    conversation_id: ShortText
    phase_id: Annotated[int, Field(ge=1, le=32)]
    phase_name: ShortText
    messages: Annotated[list[ConversationMessage], Field(min_length=1, max_length=128)]


class CollaborationSession(Schema):
    """The complete communication state for one Genesis mission."""

    session_id: ShortText
    conversations: Annotated[list[WorkerConversation], Field(max_length=32)]
    created_at: datetime
    updated_at: datetime


class CollaborationMessageDraft(Schema):
    """Provider-authored content before the Collaboration Engine assigns message metadata."""

    message_type: ConversationMessageType
    content: LongText
    receiver_worker_id: ShortText | None = None


class CollaborationContext(Schema):
    """Relevant shared knowledge supplied to a worker before task execution."""

    organization_memory: OrganizationMemory
    relevant_artifacts: Annotated[list[MissionArtifact], Field(max_length=12)]
    previous_decisions: Annotated[list[ConversationMessage], Field(max_length=12)]
    conversation_history: Annotated[list[ConversationMessage], Field(max_length=24)]


class CollaborativeExecutionRequest(Schema):
    """Existing execution data plus collaboration state; the original request is unchanged."""

    execution_request: ExecutionRequest
    artifact_collection: ArtifactCollection = Field(
        default_factory=lambda: ArtifactCollection(artifacts=[])
    )
    collaboration_session: CollaborationSession | None = None


class CollaborativeExecutionResult(Schema):
    """Execution output enriched with the updated collaboration session."""

    execution_result: ExecutionResult
    collaboration_session: CollaborationSession
