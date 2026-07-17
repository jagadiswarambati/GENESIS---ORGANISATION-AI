import type { ExecutionResult } from "@/lib/api/execution";
import type { OrganizationMemory } from "@/lib/api/memory";
import type { TaskGroup } from "@/lib/api/task-generator";
import type { WorkerAssignmentResult } from "@/lib/api/worker-assignment";

export type ArtifactStatus = "generated" | "failed";

export type MissionArtifact = {
  artifact_id: string;
  artifact_name: string;
  artifact_type: string;
  content: string;
  department: string;
  description: string;
  generated_at: string;
  status: ArtifactStatus;
  task_id: string;
  version: number;
  worker_id: string;
};

export type ArtifactCollection = {
  artifacts: MissionArtifact[];
};

export type ArtifactGenerationResult = {
  artifact_collection: ArtifactCollection;
  organization_memory: OrganizationMemory;
};

type ApiErrorPayload = { code?: string; message?: string };

export class ArtifactGenerationApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ArtifactGenerationApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function requestArtifacts(
  input: Readonly<{
    executionResult: ExecutionResult;
    taskGroups: TaskGroup[];
    workerAssignmentResult: WorkerAssignmentResult;
  }>,
): Promise<ArtifactGenerationResult> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        execution_result: input.executionResult,
        task_groups: input.taskGroups,
        worker_assignment_result: input.workerAssignmentResult,
      }),
    });
  } catch {
    throw new ArtifactGenerationApiError({
      code: "artifact_generation_unreachable",
      message: "Genesis could not reach the Artifact Generation Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ArtifactGenerationApiError({
      code: payload.code ?? "artifact_generation_error",
      message: payload.message ?? "Genesis could not generate mission artifacts.",
      status: response.status,
    });
  }

  return (await response.json()) as ArtifactGenerationResult;
}
