import type { TaskGroup } from "@/lib/api/task-generator";
import type { WorkerAssignmentResult } from "@/lib/api/worker-assignment";
import type { Workflow } from "@/lib/api/workflow";
import type { OrganizationMemory } from "@/lib/api/memory";

export type ExecutionStatus = "running" | "completed" | "failed";

export type ExecutionLog = {
  message: string;
  timestamp: string;
};

export type WorkerExecution = {
  artifact_content: string | null;
  end_time: string;
  execution_duration_ms: number;
  execution_logs: ExecutionLog[];
  output_summary: string;
  start_time: string;
  status: ExecutionStatus;
  task_id: string;
  worker_id: string;
};

export type ExecutionResult = {
  executions: WorkerExecution[];
  provider_name: string;
  organization_memory: OrganizationMemory;
  workflow: Workflow;
};

export type ProviderHealth = {
  error: string | null;
  is_healthy: boolean;
  provider_id: string;
  provider_name: string;
};

type ApiErrorPayload = { code?: string; message?: string };

export class ExecutionApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ExecutionApiError";
    this.code = code;
    this.status = status;
  }
}

export class ProviderHealthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderHealthApiError";
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function requestProviderHealth(): Promise<ProviderHealth> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/execution-provider/health`);
  } catch {
    throw new ProviderHealthApiError(
      "Genesis could not reach the execution provider health check.",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ProviderHealthApiError(
      payload.message ?? "Genesis could not validate the execution provider.",
    );
  }

  return (await response.json()) as ProviderHealth;
}

export async function executeReadyTasks(
  input: Readonly<{
    taskGroups: TaskGroup[];
    workerAssignmentResult: WorkerAssignmentResult;
    workflow: Workflow;
    organizationMemory?: OrganizationMemory;
  }>,
): Promise<ExecutionResult> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/executions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_groups: input.taskGroups,
        worker_assignment_result: input.workerAssignmentResult,
        workflow: input.workflow,
        organization_memory: input.organizationMemory ?? { entries: [] },
      }),
    });
  } catch {
    throw new ExecutionApiError({
      code: "execution_engine_unreachable",
      message: "Genesis could not reach the Execution Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ExecutionApiError({
      code: payload.code ?? "execution_engine_error",
      message: payload.message ?? "Genesis could not execute the ready tasks.",
      status: response.status,
    });
  }

  return (await response.json()) as ExecutionResult;
}
