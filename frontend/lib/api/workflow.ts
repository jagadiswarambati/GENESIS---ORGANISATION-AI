import type { TaskGroup } from "@/lib/api/task-generator";

export type WorkflowTaskStatus =
  "pending" | "ready" | "running" | "completed" | "failed" | "blocked";

export type WorkflowTaskState = {
  blocked_by: string[];
  dependencies: string[];
  status: WorkflowTaskStatus;
  task_id: string;
};

export type Workflow = {
  task_states: WorkflowTaskState[];
  workflow_id: string;
};

type ApiErrorPayload = { code?: string; message?: string };

export class WorkflowApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "WorkflowApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function requestWorkflow(taskGroups: TaskGroup[]): Promise<Workflow> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/workflows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskGroups),
    });
  } catch {
    throw new WorkflowApiError({
      code: "workflow_engine_unreachable",
      message: "Genesis could not reach the Workflow Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new WorkflowApiError({
      code: payload.code ?? "workflow_engine_error",
      message: payload.message ?? "Genesis could not initialize the task workflow.",
      status: response.status,
    });
  }

  return (await response.json()) as Workflow;
}
