import type { OrganizationBlueprint } from "@/lib/api/architect";
import type { ExecutionPlan } from "@/lib/api/execution-planner";
import type { TaskGroup } from "@/lib/api/task-generator";
import type { WorkerAssignmentResult } from "@/lib/api/worker-assignment";
import type { Workflow } from "@/lib/api/workflow";
import type { ExecutionResult } from "@/lib/api/execution";
import type { OrganizationMemory } from "@/lib/api/memory";
import type { ArtifactCollection } from "@/lib/api/artifacts";
import type { CollaborationSession } from "@/lib/api/collaboration";
import type { ProjectWorkspace } from "@/lib/api/workspace";
import type { PackageManifest, ProjectPackage } from "@/lib/api/packaging";
import type { ValidationReport } from "@/lib/api/validation";
import type { VerificationReport } from "@/lib/api/verification";
import type { DeploymentPlan } from "@/lib/api/deployment";
import type {
  ProjectRefinementResult,
  ProjectReview,
  RefinementRequest,
} from "@/lib/api/project-review";

const MISSION_CONTROL_SESSION_KEY = "genesis-mission-control-session";
const MISSION_CONTROL_SESSION_UPDATED_EVENT = "genesis-mission-control-session-updated";

export type MissionControlSession = {
  blueprint: OrganizationBlueprint;
  createdAt: string;
  executionPlan?: ExecutionPlan;
  taskGroups?: TaskGroup[];
  workerAssignmentResult?: WorkerAssignmentResult;
  workflow?: Workflow;
  executionHistory?: ExecutionResult[];
  organizationMemory?: OrganizationMemory;
  artifactCollection?: ArtifactCollection;
  collaborationSession?: CollaborationSession;
  projectWorkspace?: ProjectWorkspace;
  projectPackage?: ProjectPackage;
  packageManifest?: PackageManifest;
  packageIncludedFiles?: string[];
  validationReport?: ValidationReport;
  verificationReport?: VerificationReport;
  projectReview?: ProjectReview;
  refinementRequests?: RefinementRequest[];
  deploymentPlan?: DeploymentPlan;
};

/** Persists the already-validated Architect result across the launch route. */
export function saveMissionControlSession(blueprint: OrganizationBlueprint): void {
  const session: MissionControlSession = { blueprint, createdAt: new Date().toISOString() };
  persistMissionControlSession(session);
}

export function readMissionControlSession(): MissionControlSession | null {
  const rawSession = window.sessionStorage.getItem(MISSION_CONTROL_SESSION_KEY);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as Partial<MissionControlSession>;
    if (!session.blueprint || typeof session.createdAt !== "string") return null;
    return session as MissionControlSession;
  } catch {
    return null;
  }
}

/** Adds a planner result to the existing mission session without changing its blueprint. */
export function saveExecutionPlan(executionPlan: ExecutionPlan): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, executionPlan };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Adds deterministic phase tasks to the existing mission session. */
export function saveTaskGroups(taskGroups: TaskGroup[]): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, taskGroups };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Adds the waiting worker roster and task mappings to the existing mission session. */
export function saveWorkerAssignmentResult(
  workerAssignmentResult: WorkerAssignmentResult,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, workerAssignmentResult };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Adds dependency-aware task states to the existing mission session. */
export function saveWorkflow(workflow: Workflow): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, workflow };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Records one execution batch and replaces workflow state with the engine result. */
export function saveExecutionResult(
  executionResult: ExecutionResult,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = {
    ...session,
    executionHistory: [...(session.executionHistory ?? []), executionResult],
    organizationMemory: executionResult.organization_memory,
    workflow: executionResult.workflow,
  };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Appends artifacts and their memory references after completed task execution. */
export function saveArtifactCollection(
  artifactCollection: ArtifactCollection,
  organizationMemory: OrganizationMemory,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const existingArtifacts = session.artifactCollection?.artifacts ?? [];
  const artifactById = new Map(
    existingArtifacts.map((artifact) => [artifact.artifact_id, artifact]),
  );
  for (const artifact of artifactCollection.artifacts) {
    artifactById.set(artifact.artifact_id, artifact);
  }

  const updatedSession: MissionControlSession = {
    ...session,
    artifactCollection: { artifacts: [...artifactById.values()] },
    organizationMemory,
  };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Saves the collaboration record independently of workflow and execution state. */
export function saveCollaborationSession(
  collaborationSession: CollaborationSession,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, collaborationSession };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Records the repository structure independently from artifacts and execution state. */
export function saveProjectWorkspace(
  projectWorkspace: ProjectWorkspace,
  organizationMemory: OrganizationMemory,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = {
    ...session,
    organizationMemory,
    projectWorkspace,
  };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Persists lightweight package metadata without placing archive bytes in session storage. */
export function saveProjectPackage(
  projectPackage: ProjectPackage,
  packageManifest: PackageManifest,
  packageIncludedFiles: string[],
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = {
    ...session,
    packageIncludedFiles,
    packageManifest,
    projectPackage,
    validationReport: undefined,
    verificationReport: undefined,
    deploymentPlan: undefined,
  };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Stores an inspection report separately from workspace and package generation outputs. */
export function saveValidationReport(
  validationReport: ValidationReport,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, validationReport };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Stores a safe deterministic verification result for the current package revision. */
export function saveVerificationReport(
  verificationReport: VerificationReport,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, verificationReport };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Stores an additive deployment overlay independently from the package it consumes. */
export function saveDeploymentPlan(deploymentPlan: DeploymentPlan): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, deploymentPlan };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Stores a review independently of execution, validation, and verification state. */
export function saveProjectReview(projectReview: ProjectReview): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const updatedSession: MissionControlSession = { ...session, projectReview };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

/** Applies only refined artifact versions, then allows existing workspace packaging to refresh normally. */
export function saveProjectRefinementResult(
  result: ProjectRefinementResult,
): MissionControlSession | null {
  const session = readMissionControlSession();
  if (!session) return null;

  const artifactById = new Map(
    (session.artifactCollection?.artifacts ?? []).map((artifact) => [
      artifact.artifact_id,
      artifact,
    ]),
  );
  for (const artifact of result.artifact_collection.artifacts) {
    artifactById.set(artifact.artifact_id, artifact);
  }
  const refinementRequests = [
    ...(session.refinementRequests ?? []).filter(
      (request) =>
        request.refinement_request_id !== result.refinement_request.refinement_request_id,
    ),
    result.refinement_request,
  ];
  const updatedSession: MissionControlSession = {
    ...session,
    artifactCollection: { artifacts: [...artifactById.values()] },
    organizationMemory: result.organization_memory,
    projectReview: result.project_review,
    refinementRequests,
    projectWorkspace: undefined,
    projectPackage: undefined,
    packageManifest: undefined,
    packageIncludedFiles: undefined,
    validationReport: undefined,
    verificationReport: undefined,
    deploymentPlan: undefined,
  };
  persistMissionControlSession(updatedSession);
  return updatedSession;
}

export function formatMissionControlTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoTimestamp));
}

/** Subscribes dashboard views to persisted mission updates without duplicating state. */
export function subscribeMissionControlSession(callback: () => void): () => void {
  const handleStorage = (event: StorageEvent): void => {
    if (event.storageArea === window.sessionStorage && event.key === MISSION_CONTROL_SESSION_KEY) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(MISSION_CONTROL_SESSION_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MISSION_CONTROL_SESSION_UPDATED_EVENT, callback);
  };
}

function persistMissionControlSession(session: MissionControlSession): void {
  window.sessionStorage.setItem(MISSION_CONTROL_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(MISSION_CONTROL_SESSION_UPDATED_EVENT));
}
