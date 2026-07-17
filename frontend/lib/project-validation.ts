import type { ProjectValidationInput } from "@/lib/api/validation";
import type { MissionControlSession } from "@/lib/mission-control-session";

/** Builds a read-only validation request from the existing mission session. */
export function createProjectValidationInput(
  session: MissionControlSession,
): ProjectValidationInput | null {
  if (!session.projectWorkspace || !session.projectPackage) return null;

  return {
    artifactCollection: session.artifactCollection ?? { artifacts: [] },
    packageIncludedFiles: session.packageIncludedFiles ?? [],
    projectPackage: session.projectPackage,
    taskGroups: session.taskGroups ?? [],
    workerAssignmentResult: session.workerAssignmentResult,
    workflow: session.workflow,
    workspace: session.projectWorkspace,
  };
}
