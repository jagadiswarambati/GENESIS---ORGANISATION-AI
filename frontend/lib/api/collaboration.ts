import type { ArtifactCollection } from "@/lib/api/artifacts";
import type { ExecutionResult } from "@/lib/api/execution";
import type { OrganizationMemory } from "@/lib/api/memory";
import type { TaskGroup } from "@/lib/api/task-generator";
import type { WorkerAssignmentResult } from "@/lib/api/worker-assignment";
import type { Workflow } from "@/lib/api/workflow";

export type ConversationMessageType =
  | "suggestion"
  | "question"
  | "answer"
  | "decision"
  | "review_request"
  | "review_response"
  | "information"
  | "warning";

export type ConversationMessage = {
  content: string;
  message_id: string;
  message_type: ConversationMessageType;
  receiver_worker_id: string | null;
  related_task_id: string;
  sender_department: string;
  sender_worker_id: string;
  session_id: string;
  timestamp: string;
};

export type WorkerConversation = {
  conversation_id: string;
  messages: ConversationMessage[];
  phase_id: number;
  phase_name: string;
};

export type CollaborationSession = {
  conversations: WorkerConversation[];
  created_at: string;
  session_id: string;
  updated_at: string;
};

export type CollaborativeExecutionResult = {
  collaboration_session: CollaborationSession;
  execution_result: ExecutionResult;
};

type ApiErrorPayload = { code?: string; message?: string };

export class CollaborationApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "CollaborationApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function executeCollaborativeReadyTasks(
  input: Readonly<{
    artifactCollection?: ArtifactCollection;
    collaborationSession?: CollaborationSession;
    organizationMemory?: OrganizationMemory;
    taskGroups: TaskGroup[];
    workerAssignmentResult: WorkerAssignmentResult;
    workflow: Workflow;
  }>,
): Promise<CollaborativeExecutionResult> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/collaborative-executions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifact_collection: input.artifactCollection ?? { artifacts: [] },
        collaboration_session: input.collaborationSession ?? null,
        execution_request: {
          organization_memory: input.organizationMemory ?? { entries: [] },
          task_groups: input.taskGroups,
          worker_assignment_result: input.workerAssignmentResult,
          workflow: input.workflow,
        },
      }),
    });
  } catch {
    throw new CollaborationApiError({
      code: "collaboration_engine_unreachable",
      message: "Genesis could not reach the Collaboration Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new CollaborationApiError({
      code: payload.code ?? "collaboration_engine_error",
      message: payload.message ?? "Genesis could not coordinate the organization.",
      status: response.status,
    });
  }

  return (await response.json()) as CollaborativeExecutionResult;
}
