import type { ExecutionPlan } from "@/lib/api/execution-planner";

export type Task = {
  dependencies: string[];
  department: string;
  description: string;
  estimated_duration: string;
  phase_id: number;
  priority: "high" | "medium" | "low";
  status: "pending";
  task_id: string;
  task_name: string;
};

export type TaskGroup = {
  department: string;
  phase_id: number;
  phase_name: string;
  tasks: Task[];
};

type ApiErrorPayload = { code?: string; message?: string };

export class TaskGeneratorApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "TaskGeneratorApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function requestTaskGroups(executionPlan: ExecutionPlan): Promise<TaskGroup[]> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/task-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(executionPlan),
    });
  } catch {
    throw new TaskGeneratorApiError({
      code: "task_generator_unreachable",
      message: "Genesis could not reach the Task Generator. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new TaskGeneratorApiError({
      code: payload.code ?? "task_generator_error",
      message: payload.message ?? "Genesis could not generate phase tasks.",
      status: response.status,
    });
  }

  return (await response.json()) as TaskGroup[];
}
