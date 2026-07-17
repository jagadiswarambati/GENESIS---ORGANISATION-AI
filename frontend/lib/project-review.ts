import type {
  ProjectRefinementInput,
  ProjectReview,
  ProjectReviewInput,
} from "@/lib/api/project-review";
import type { MissionControlSession } from "@/lib/mission-control-session";

/** Collects existing project signals for a provider-neutral review request. */
export function createProjectReviewInput(
  session: MissionControlSession,
): ProjectReviewInput | null {
  if (!session.projectWorkspace) return null;

  return {
    artifactCollection: session.artifactCollection ?? { artifacts: [] },
    organizationMemory: session.organizationMemory ?? { entries: [] },
    packageIncludedFiles: session.packageIncludedFiles ?? [],
    projectPackage: session.projectPackage,
    validationReport: session.validationReport,
    verificationReport: session.verificationReport,
    workspace: session.projectWorkspace,
  };
}

/** Builds a selective request, never a request to regenerate the entire project. */
export function createProjectRefinementInput(
  session: MissionControlSession,
  projectReview: ProjectReview,
  selectedSuggestionIds: string[],
): ProjectRefinementInput | null {
  if (!session.projectWorkspace || selectedSuggestionIds.length === 0) return null;

  return {
    artifactCollection: session.artifactCollection ?? { artifacts: [] },
    organizationMemory: session.organizationMemory ?? { entries: [] },
    projectReview,
    selectedSuggestionIds,
    workspace: session.projectWorkspace,
  };
}
