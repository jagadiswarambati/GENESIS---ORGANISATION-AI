from datetime import UTC, datetime
from hashlib import sha256
from uuid import uuid4

from app.schemas.artifact import ArtifactCollection
from app.schemas.collaboration import (
    CollaborationContext,
    CollaborationMessageDraft,
    CollaborationSession,
    ConversationMessage,
    WorkerConversation,
)
from app.schemas.memory import MemoryEntry, OrganizationMemory
from app.schemas.task_generator import Task
from app.schemas.worker_assignment import AIWorker

CONTEXT_ARTIFACT_LIMIT = 12
CONTEXT_CONVERSATION_LIMIT = 24
CONTEXT_DECISION_LIMIT = 12
MEMORY_CONTENT_LIMIT = 1200


class CollaborationEngine:
    """Build communication context and preserve worker conversations outside execution logic."""

    def create_session(self) -> CollaborationSession:
        now = datetime.now(UTC)
        return CollaborationSession(
            session_id=f"collaboration-{uuid4().hex[:12]}",
            conversations=[],
            created_at=now,
            updated_at=now,
        )

    def build_context(
        self,
        session: CollaborationSession,
        organization_memory: OrganizationMemory,
        artifact_collection: ArtifactCollection,
        task: Task,
    ) -> CollaborationContext:
        """Select only the relevant shared knowledge for the next worker action."""

        phase_messages = self._phase_messages(session, task.phase_id)
        history = phase_messages[-CONTEXT_CONVERSATION_LIMIT:]
        decisions = [
            message for message in self._all_messages(session) if message.message_type == "decision"
        ]
        relevant_artifacts = [
            artifact
            for artifact in artifact_collection.artifacts
            if artifact.department == task.department or artifact.task_id in task.dependencies
        ][-CONTEXT_ARTIFACT_LIMIT:]
        if not relevant_artifacts:
            relevant_artifacts = artifact_collection.artifacts[-CONTEXT_ARTIFACT_LIMIT:]

        return CollaborationContext(
            organization_memory=organization_memory,
            relevant_artifacts=relevant_artifacts,
            previous_decisions=decisions[-CONTEXT_DECISION_LIMIT:],
            conversation_history=history,
        )

    def append_message(
        self,
        session: CollaborationSession,
        task: Task,
        worker: AIWorker,
        draft: CollaborationMessageDraft,
        phase_name: str,
    ) -> CollaborationSession:
        """Add one provider-authored message to the appropriate execution-phase thread."""

        timestamp = datetime.now(UTC)
        message = ConversationMessage(
            message_id=self._message_id(session, task, worker, timestamp),
            session_id=session.session_id,
            sender_worker_id=worker.worker_id,
            sender_department=worker.department,
            receiver_worker_id=draft.receiver_worker_id,
            related_task_id=task.task_id,
            message_type=draft.message_type,
            content=draft.content,
            timestamp=timestamp,
        )
        conversations = list(session.conversations)
        conversation_index = next(
            (index for index, item in enumerate(conversations) if item.phase_id == task.phase_id),
            None,
        )

        if conversation_index is None:
            conversations.append(
                WorkerConversation(
                    conversation_id=f"conversation-{session.session_id}-{task.phase_id}",
                    phase_id=task.phase_id,
                    phase_name=phase_name,
                    messages=[message],
                )
            )
        else:
            conversation = conversations[conversation_index]
            conversations[conversation_index] = conversation.model_copy(
                update={"messages": [*conversation.messages, message]}
            )

        return session.model_copy(update={"conversations": conversations, "updated_at": timestamp})

    def store_memory_references(
        self,
        memory: OrganizationMemory,
        session: CollaborationSession,
    ) -> OrganizationMemory:
        """Expose collaboration decisions to future workers through existing organization memory."""

        entries = list(memory.entries)
        existing_ids = {entry.memory_id for entry in entries}
        for message in self._all_messages(session):
            memory_id = f"memory-collaboration-{message.message_id}"
            if memory_id in existing_ids or len(entries) >= 256:
                continue

            memory_content = (
                f"Session: {message.session_id}\n"
                f"Sender: {message.sender_worker_id}\n"
                f"Message: {message.content}"
            )[:MEMORY_CONTENT_LIMIT]
            entries.append(
                MemoryEntry(
                    memory_id=memory_id,
                    task_id=message.related_task_id,
                    worker_id=message.sender_worker_id,
                    department=message.sender_department,
                    title=f"Collaboration: {message.message_type}",
                    summary=message.content,
                    content=memory_content,
                    timestamp=message.timestamp,
                    tags=["collaboration", message.message_type, message.sender_department.lower()],
                )
            )
            existing_ids.add(memory_id)

        return memory.model_copy(update={"entries": entries})

    @staticmethod
    def _phase_messages(session: CollaborationSession, phase_id: int) -> list[ConversationMessage]:
        for conversation in session.conversations:
            if conversation.phase_id == phase_id:
                return list(conversation.messages)
        return []

    @staticmethod
    def _all_messages(session: CollaborationSession) -> list[ConversationMessage]:
        return [
            message for conversation in session.conversations for message in conversation.messages
        ]

    @staticmethod
    def _message_id(
        session: CollaborationSession,
        task: Task,
        worker: AIWorker,
        timestamp: datetime,
    ) -> str:
        source = f"{session.session_id}:{task.task_id}:{worker.worker_id}:{timestamp.isoformat()}"
        return f"message-{sha256(source.encode()).hexdigest()[:12]}"
