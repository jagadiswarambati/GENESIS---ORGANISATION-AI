import type { ProjectVerificationInput } from "@/lib/api/verification";
import type { MissionControlSession } from "@/lib/mission-control-session";

/** Selects only existing workspace and package data for a safe verification request. */
export function createProjectVerificationInput(
  session: MissionControlSession,
): ProjectVerificationInput | null {
  if (!session.projectWorkspace || !session.projectPackage) return null;

  return {
    packageIncludedFiles: session.packageIncludedFiles ?? [],
    projectPackage: session.projectPackage,
    workspace: session.projectWorkspace,
  };
}
