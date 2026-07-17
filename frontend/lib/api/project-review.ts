import type { ArtifactCollection } from "@/lib/api/artifacts";
import type { OrganizationMemory } from "@/lib/api/memory";
import type { ProjectPackage } from "@/lib/api/packaging";
import type { ValidationReport, ValidationSeverity } from "@/lib/api/validation";
import type { VerificationReport } from "@/lib/api/verification";
import type { ProjectWorkspace } from "@/lib/api/workspace";

export type ReviewCategory =
  | "code_quality"
  | "documentation"
  | "project_structure"
  | "api_design"
  | "folder_organization"
  | "docker_configuration"
  | "test_coverage"
  | "readme_quality";
export type ReviewSuggestionStatus = "pending" | "resolved";
export type RefinementStatus = "prepared" | "applied";

export type ReviewSuggestion = {
  category: ReviewCategory;
  description: string;
  related_file: string | null;
  severity: ValidationSeverity;
  status: ReviewSuggestionStatus;
  suggested_improvement: string;
  suggestion_id: string;
  timestamp: string;
};

export type ProjectReview = {
  created_at: string;
  improvement_opportunities: string[];
  overall_score: number;
  review_id: string;
  reviewer_name: string;
  source_package_id: string | null;
  source_workspace_id: string;
  source_workspace_updated_at: string;
  strengths: string[];
  suggestions: ReviewSuggestion[];
  weaknesses: string[];
};

export type RefinementRequest = {
  affected_artifact_ids: string[];
  created_at: string;
  refinement_request_id: string;
  review_id: string;
  selected_suggestion_ids: string[];
  status: RefinementStatus;
  summary: string;
};

export type ProjectReviewInput = {
  artifactCollection: ArtifactCollection;
  organizationMemory: OrganizationMemory;
  packageIncludedFiles: string[];
  projectPackage?: ProjectPackage;
  validationReport?: ValidationReport;
  verificationReport?: VerificationReport;
  workspace: ProjectWorkspace;
};

export type ProjectRefinementInput = {
  artifactCollection: ArtifactCollection;
  organizationMemory: OrganizationMemory;
  projectReview: ProjectReview;
  selectedSuggestionIds: string[];
  workspace: ProjectWorkspace;
};

export type ProjectRefinementResult = {
  artifact_collection: ArtifactCollection;
  organization_memory: OrganizationMemory;
  project_review: ProjectReview;
  refinement_request: RefinementRequest;
};

type ApiErrorPayload = { code?: string; detail?: string; message?: string };

export class ProjectReviewApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ProjectReviewApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Reviews existing project outputs without changing the execution or packaging pipeline. */
export async function requestProjectReview(
  input: Readonly<ProjectReviewInput>,
): Promise<ProjectReview> {
  return requestProjectReviewApi("/api/v1/project-reviews", {
    artifact_collection: input.artifactCollection,
    organization_memory: input.organizationMemory,
    package_included_files: input.packageIncludedFiles,
    project_package: input.projectPackage ?? null,
    validation_report: input.validationReport ?? null,
    verification_report: input.verificationReport ?? null,
    workspace: input.workspace,
  });
}

/** Creates a refinement request and updates only artifacts linked to selected suggestions. */
export async function requestProjectRefinement(
  input: Readonly<ProjectRefinementInput>,
): Promise<ProjectRefinementResult> {
  return requestProjectReviewApi("/api/v1/project-reviews/refinements", {
    artifact_collection: input.artifactCollection,
    organization_memory: input.organizationMemory,
    project_review: input.projectReview,
    selected_suggestion_ids: input.selectedSuggestionIds,
    workspace: input.workspace,
  });
}

async function requestProjectReviewApi<T>(path: string, body: object): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ProjectReviewApiError({
      code: "project_review_unreachable",
      message: "Genesis could not reach the Project Review Service. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ProjectReviewApiError({
      code: payload.code ?? "project_review_error",
      message: payload.message ?? payload.detail ?? "Genesis could not review the project.",
      status: response.status,
    });
  }

  return (await response.json()) as T;
}
