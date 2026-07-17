import type { PackageManifest, ProjectPackage } from "@/lib/api/packaging";

export type DeploymentStatus = "ready" | "needs_configuration";
export type RuntimeStatus = "ready" | "configuration_required" | "not_ready";
export type DeploymentAssetStatus = "provided" | "generated";
export type HealthCheckStatus = "generated" | "unavailable";
export type DeploymentTarget = "frontend" | "backend" | "database";

export type DeploymentAsset = {
  content: string | null;
  description: string;
  file_path: string;
  status: DeploymentAssetStatus;
};

export type RuntimeRequirement = {
  name: string;
  purpose: string;
  version: string;
};

export type DeploymentEnvironmentVariable = {
  description: string;
  example: string;
  name: string;
  required: boolean;
};

export type HealthCheck = {
  description: string;
  endpoint: string | null;
  service: string;
  status: HealthCheckStatus;
};

export type DeploymentRecommendation = {
  rationale: string;
  recommendation: string;
  target: DeploymentTarget;
};

export type DeploymentPlan = {
  created_at: string;
  deployment_assets: DeploymentAsset[];
  deployment_id: string;
  deployment_recommendations: DeploymentRecommendation[];
  health_checks: HealthCheck[];
  missing_configuration: string[];
  package_id: string;
  required_environment_variables: DeploymentEnvironmentVariable[];
  runtime_configuration_summary: string;
  runtime_requirements: RuntimeRequirement[];
  runtime_status: RuntimeStatus;
  source_workspace_id: string;
  source_workspace_updated_at: string;
  status: DeploymentStatus;
};

export type DeploymentGenerationInput = {
  packageIncludedFiles: string[];
  packageManifest: PackageManifest;
  projectPackage: ProjectPackage;
};

type ApiErrorPayload = { code?: string; detail?: string; message?: string };

export class DeploymentGenerationApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "DeploymentGenerationApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Produces a deployment overlay from the existing package; it does not repackage or rewrite it. */
export async function requestDeploymentPlan(
  input: Readonly<DeploymentGenerationInput>,
): Promise<DeploymentPlan> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/deployments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_included_files: input.packageIncludedFiles,
        package_manifest: input.packageManifest,
        project_package: input.projectPackage,
      }),
    });
  } catch {
    throw new DeploymentGenerationApiError({
      code: "deployment_unreachable",
      message: "Genesis could not reach the Deployment Generation Service. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new DeploymentGenerationApiError({
      code: payload.code ?? "deployment_generation_error",
      message: payload.message ?? payload.detail ?? "Genesis could not generate deployment assets.",
      status: response.status,
    });
  }

  return (await response.json()) as DeploymentPlan;
}
