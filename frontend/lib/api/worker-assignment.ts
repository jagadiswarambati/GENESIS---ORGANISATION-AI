import type { TaskGroup } from "@/lib/api/task-generator";

export type AIWorker = {
  assigned_tasks: string[];
  avatar_icon: string | null;
  capabilities: string[];
  current_status: "waiting";
  department: string;
  role: string;
  worker_id: string;
  worker_name: string;
};

export type WorkerAssignment = {
  task_id: string;
  worker_id: string;
};

export type WorkerAssignmentResult = {
  assignments: WorkerAssignment[];
  workers: AIWorker[];
};

type ApiErrorPayload = { code?: string; message?: string };

export class WorkerAssignmentApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "WorkerAssignmentApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function requestWorkerAssignments(
  taskGroups: TaskGroup[],
): Promise<WorkerAssignmentResult> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/worker-assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskGroups),
    });
  } catch {
    throw new WorkerAssignmentApiError({
      code: "worker_assignment_unreachable",
      message: "Genesis could not reach Worker Assignment. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new WorkerAssignmentApiError({
      code: payload.code ?? "worker_assignment_error",
      message: payload.message ?? "Genesis could not assign workers to phase tasks.",
      status: response.status,
    });
  }

  return (await response.json()) as WorkerAssignmentResult;
}
