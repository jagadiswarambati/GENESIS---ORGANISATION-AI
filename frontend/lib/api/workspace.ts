import type { ArtifactCollection } from "@/lib/api/artifacts";
import type { OrganizationMemory } from "@/lib/api/memory";

export type WorkspaceBuildStatus = "pending" | "ready" | "failed";

/** A file in the generated repository, traced to the artifact that supplied it. */
export type WorkspaceFile = {
  department: string;
  file_content: string;
  file_name: string;
  file_path: string;
  generated_at: string;
  source_artifact_id: string;
  version: number;
};

/** Recursive tree node for a repository directory. */
export type WorkspaceFolder = {
  child_files: WorkspaceFile[];
  child_folders: WorkspaceFolder[];
  folder_name: string;
  folder_path: string;
};

/** The provider-neutral repository organization produced from mission artifacts. */
export type ProjectWorkspace = {
  build_status: WorkspaceBuildStatus;
  created_at: string;
  last_updated: string;
  project_name: string;
  root_folder: WorkspaceFolder;
  total_files: number;
  total_folders: number;
  workspace_id: string;
};

export type WorkspaceGenerationResult = {
  organization_memory: OrganizationMemory;
  workspace: ProjectWorkspace;
};

type ApiErrorPayload = { code?: string; detail?: string; message?: string };

export class WorkspaceApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "WorkspaceApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Builds a repository from existing artifacts; it never creates or alters artifacts. */
export async function requestWorkspace(
  input: Readonly<{
    artifactCollection: ArtifactCollection;
    existingWorkspace?: ProjectWorkspace;
    organizationMemory: OrganizationMemory;
    projectName: string;
  }>,
): Promise<WorkspaceGenerationResult> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifact_collection: input.artifactCollection,
        existing_workspace: input.existingWorkspace,
        organization_memory: input.organizationMemory,
        project_name: input.projectName,
      }),
    });
  } catch {
    throw new WorkspaceApiError({
      code: "workspace_unreachable",
      message: "Genesis could not reach the Project Workspace Engine. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new WorkspaceApiError({
      code: payload.code ?? "workspace_generation_error",
      message:
        payload.message ?? payload.detail ?? "Genesis could not assemble the project workspace.",
      status: response.status,
    });
  }

  return (await response.json()) as WorkspaceGenerationResult;
}
