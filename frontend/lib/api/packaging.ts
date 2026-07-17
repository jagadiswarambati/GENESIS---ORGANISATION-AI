import type { ProjectWorkspace } from "@/lib/api/workspace";

export type PackageBuildStatus = "pending" | "ready" | "failed";

export type RepositoryStatistics = {
  total_files: number;
  total_folders: number;
  total_size: number;
};

/** Read-only organization context included in a generated package manifest. */
export type PackageManifestContext = {
  departments: string[];
  generated_artifacts: number;
  generated_workers: string[];
  mission_summary: string;
  organization_summary: string;
  total_tasks: number;
  completed_tasks: number;
};

export type PackageManifest = PackageManifestContext & {
  package_timestamp: string;
  project_name: string;
  repository_statistics: RepositoryStatistics;
};

/** Metadata retained for a package without storing the ZIP in browser session storage. */
export type ProjectPackage = {
  build_status: PackageBuildStatus;
  created_at: string;
  package_id: string;
  package_version: string;
  project_name: string;
  source_workspace_id: string;
  source_workspace_updated_at: string;
  total_files: number;
  total_size: number;
};

/** A transient ZIP payload with its durable package metadata and manifest. */
export type ExportBundle = {
  archive_base64: string;
  archive_file_name: string;
  included_files: string[];
  manifest: PackageManifest;
  project_package: ProjectPackage;
};

type ApiErrorPayload = { code?: string; detail?: string; message?: string };

export class ProjectPackagingApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ProjectPackagingApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Produces a ZIP from existing workspace files; it does not regenerate the workspace. */
export async function requestProjectPackage(
  input: Readonly<{
    manifestContext: PackageManifestContext;
    workspace: ProjectWorkspace;
  }>,
): Promise<ExportBundle> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manifest_context: input.manifestContext,
        workspace: input.workspace,
      }),
    });
  } catch {
    throw new ProjectPackagingApiError({
      code: "packaging_unreachable",
      message: "Genesis could not reach the Project Packaging Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ProjectPackagingApiError({
      code: payload.code ?? "packaging_error",
      message: payload.message ?? payload.detail ?? "Genesis could not package the project.",
      status: response.status,
    });
  }

  return (await response.json()) as ExportBundle;
}
