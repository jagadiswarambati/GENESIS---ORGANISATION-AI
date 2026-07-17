import type { PackageManifestContext } from "@/lib/api/packaging";
import type { MissionControlSession } from "@/lib/mission-control-session";

/** Derives the export description from existing session data without creating duplicate state. */
export function createPackageManifestContext(
  session: MissionControlSession,
): PackageManifestContext {
  const tasks = session.taskGroups?.flatMap((group) => group.tasks) ?? [];
  const completedTasks =
    session.workflow?.task_states.filter((taskState) => taskState.status === "completed").length ??
    0;

  return {
    departments: session.blueprint.departments.map((department) => department.name),
    generated_artifacts: session.artifactCollection?.artifacts.length ?? 0,
    generated_workers:
      session.workerAssignmentResult?.workers.map((worker) => worker.worker_name) ?? [],
    mission_summary: session.blueprint.mission_summary,
    organization_summary: `${session.blueprint.organization_type} organized with ${session.blueprint.suggested_culture} culture.`,
    total_tasks: tasks.length,
    completed_tasks: completedTasks,
  };
}
