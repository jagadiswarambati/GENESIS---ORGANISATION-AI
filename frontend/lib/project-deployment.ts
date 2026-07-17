import type { DeploymentGenerationInput } from "@/lib/api/deployment";
import type { MissionControlSession } from "@/lib/mission-control-session";

/** Selects package data only; deployment generation never consumes or changes execution state. */
export function createDeploymentGenerationInput(
  session: MissionControlSession,
): DeploymentGenerationInput | null {
  if (!session.projectPackage || !session.packageManifest) return null;

  return {
    packageIncludedFiles: session.packageIncludedFiles ?? [],
    packageManifest: session.packageManifest,
    projectPackage: session.projectPackage,
  };
}
