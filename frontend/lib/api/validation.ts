import type { ArtifactCollection } from "@/lib/api/artifacts";
import type { ProjectPackage } from "@/lib/api/packaging";
import type { TaskGroup } from "@/lib/api/task-generator";
import type { WorkerAssignmentResult } from "@/lib/api/worker-assignment";
import type { Workflow } from "@/lib/api/workflow";
import type { ProjectWorkspace } from "@/lib/api/workspace";

export type ValidationSeverity = "warning" | "error" | "critical";
export type ProjectHealthStatus = "excellent" | "good" | "needs_review";

export type ValidationIssue = {
  category: string;
  description: string;
  file: string | null;
  issue_id: string;
  severity: ValidationSeverity;
  suggested_fix: string;
  timestamp: string;
};

export type ProjectHealth = {
  critical_issues: number;
  errors: number;
  passed_checks: number;
  score: number;
  status: ProjectHealthStatus;
  total_checks: number;
  warnings: number;
};

export type ValidationReport = {
  created_at: string;
  health: ProjectHealth;
  issues: ValidationIssue[];
  report_id: string;
  source_package_id: string;
  source_workspace_id: string;
  source_workspace_updated_at: string;
};

export type ProjectValidationInput = {
  artifactCollection: ArtifactCollection;
  packageIncludedFiles: string[];
  projectPackage: ProjectPackage;
  taskGroups: TaskGroup[];
  workerAssignmentResult?: WorkerAssignmentResult;
  workflow?: Workflow;
  workspace: ProjectWorkspace;
};

type ApiErrorPayload = { code?: string; detail?: string; message?: string };

export class ProjectValidationApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ProjectValidationApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Validates existing outputs only; no planning, execution, workspace, or package generation occurs. */
export async function requestProjectValidation(
  input: Readonly<ProjectValidationInput>,
): Promise<ValidationReport> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/validations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifact_collection: input.artifactCollection,
        package_included_files: input.packageIncludedFiles,
        project_package: input.projectPackage,
        task_groups: input.taskGroups,
        worker_assignment_result: input.workerAssignmentResult,
        workflow: input.workflow,
        workspace: input.workspace,
      }),
    });
  } catch {
    throw new ProjectValidationApiError({
      code: "validation_unreachable",
      message: "Genesis could not reach the Project Validation Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ProjectValidationApiError({
      code: payload.code ?? "validation_error",
      message: payload.message ?? payload.detail ?? "Genesis could not validate the project.",
      status: response.status,
    });
  }

  return (await response.json()) as ValidationReport;
}
