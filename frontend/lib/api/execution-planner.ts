import type { OrganizationBlueprint } from "@/lib/api/architect";

export type ExecutionPhase = {
  dependencies: string[];
  department: string;
  estimated_duration: string;
  objective: string;
  phase_name: string;
  phase_number: number;
  status: "pending";
};

export type ExecutionPlan = {
  phases: ExecutionPhase[];
};

type ApiErrorPayload = { code?: string; message?: string };

export class ExecutionPlannerApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ExecutionPlannerApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function requestExecutionPlan(
  blueprint: OrganizationBlueprint,
): Promise<ExecutionPlan> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/execution-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blueprint),
    });
  } catch {
    throw new ExecutionPlannerApiError({
      code: "execution_planner_unreachable",
      message: "Genesis could not reach the Execution Planner. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ExecutionPlannerApiError({
      code: payload.code ?? "execution_planner_error",
      message: payload.message ?? "Genesis could not create an execution plan.",
      status: response.status,
    });
  }

  return (await response.json()) as ExecutionPlan;
}
