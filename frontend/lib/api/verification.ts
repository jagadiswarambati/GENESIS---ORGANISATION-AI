import type { ProjectPackage } from "@/lib/api/packaging";
import type { ProjectWorkspace } from "@/lib/api/workspace";

export type VerificationStatus = "passed" | "failed";

export type SandboxRun = {
  build_status: VerificationStatus;
  exit_code: number;
  finished_at: string;
  package_id: string;
  started_at: string;
  status: VerificationStatus;
  test_status: VerificationStatus;
  verification_id: string;
  verification_summary: string;
};

export type BuildResult = {
  build_logs: string[];
  exit_code: number;
  failed_checks: number;
  passed_checks: number;
  status: VerificationStatus;
  target: string;
};

export type VerificationReport = {
  build_results: BuildResult[];
  sandbox_run: SandboxRun;
  source_package_id: string;
  source_workspace_id: string;
  source_workspace_updated_at: string;
};

export type ProjectVerificationInput = {
  packageIncludedFiles: string[];
  projectPackage: ProjectPackage;
  workspace: ProjectWorkspace;
};

type ApiErrorPayload = { code?: string; detail?: string; message?: string };

export class ProjectVerificationApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ProjectVerificationApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Performs deterministic, non-executing structural verification of an existing package. */
export async function requestProjectVerification(
  input: Readonly<ProjectVerificationInput>,
): Promise<VerificationReport> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/verifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_included_files: input.packageIncludedFiles,
        project_package: input.projectPackage,
        workspace: input.workspace,
      }),
    });
  } catch {
    throw new ProjectVerificationApiError({
      code: "verification_unreachable",
      message: "Genesis could not reach the Project Verification Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ProjectVerificationApiError({
      code: payload.code ?? "verification_error",
      message: payload.message ?? payload.detail ?? "Genesis could not verify the project.",
      status: response.status,
    });
  }

  return (await response.json()) as VerificationReport;
}
