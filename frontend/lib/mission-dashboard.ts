import type { ExecutionStatus, WorkerExecution } from "@/lib/api/execution";
import type { MissionArtifact } from "@/lib/api/artifacts";
import type { ConversationMessage } from "@/lib/api/collaboration";
import type { Task } from "@/lib/api/task-generator";
import type { ProjectHealthStatus } from "@/lib/api/validation";
import type { ProjectImplementationLevel, VerificationStatus } from "@/lib/api/verification";
import type { DeploymentStatus, RuntimeStatus } from "@/lib/api/deployment";
import type { WorkspaceFile, WorkspaceFolder } from "@/lib/api/workspace";
import type { WorkflowTaskStatus } from "@/lib/api/workflow";
import type { MissionControlSession } from "@/lib/mission-control-session";

export type DashboardWorkerStatus = ExecutionStatus | "waiting";
export type DashboardMissionStatus = "preparing" | "active" | "blocked" | "completed" | "failed";

export type DashboardActivity = {
  detail: string;
  timestamp: string;
  title: string;
};

export type DashboardPhase = {
  completedTasks: number;
  completionPercentage: number;
  name: string;
  status: "pending" | "active" | "blocked" | "completed" | "failed";
  totalTasks: number;
};

export type MissionDashboardData = {
  activity: DashboardActivity[];
  artifacts: {
    byDepartment: Array<{ count: number; department: string }>;
    recent: MissionArtifact[];
    total: number;
  };
  collaboration: {
    activeSessions: number;
    messagesByDepartment: Array<{ count: number; department: string }>;
    mostActiveWorker: string;
    recent: ConversationMessage[];
    totalConversations: number;
  };
  estimatedRemainingTime: string;
  execution: { activePhase: string; completed: number; remaining: number; total: number };
  latestMemoryEntry: string;
  memory: { total: number };
  missionProgress: number;
  missionStatus: DashboardMissionStatus;
  phases: DashboardPhase[];
  validation: {
    criticalIssues: number;
    healthScore: number;
    status: ProjectHealthStatus | "pending";
    totalIssues: number;
    warnings: number;
  };
  verification: {
    buildSuccessRate: number;
    implementationLevel: ProjectImplementationLevel | "pending";
    lastVerificationTime: string;
    status: VerificationStatus | "pending";
  };
  review: {
    pendingSuggestions: number;
    resolvedSuggestions: number;
    score: number | null;
    totalSuggestions: number;
  };
  deployment: {
    isReady: boolean;
    missingConfiguration: string[];
    runtimeStatus: RuntimeStatus | "pending";
    status: DeploymentStatus | "pending";
  };
  packaging: {
    downloadCount: number;
    exportStatus: "pending" | "ready" | "failed";
    latestPackage: string;
    packageSize: number;
  };
  taskCounts: Record<WorkflowTaskStatus, number>;
  totalExecutionTimeMs: number;
  workers: Array<{
    assignedTaskCount: number;
    completedTaskCount: number;
    department: string;
    name: string;
    status: DashboardWorkerStatus;
    workerId: string;
  }>;
  workerCounts: Record<DashboardWorkerStatus, number>;
  workspace: {
    buildStatus: "pending" | "ready" | "failed";
    largestDepartments: Array<{ count: number; department: string }>;
    projectName: string;
    projectSize: number;
    totalFiles: number;
    totalFolders: number;
    totalSourceFiles: number;
  };
};

const emptyTaskCounts: Record<WorkflowTaskStatus, number> = {
  blocked: 0,
  completed: 0,
  failed: 0,
  pending: 0,
  ready: 0,
  running: 0,
};

const emptyWorkerCounts: Record<DashboardWorkerStatus, number> = {
  completed: 0,
  failed: 0,
  running: 0,
  waiting: 0,
};

export function aggregateMissionDashboard(session: MissionControlSession): MissionDashboardData {
  const taskGroups = session.taskGroups ?? [];
  const tasks = taskGroups.flatMap((group) => group.tasks);
  const taskStateById = new Map(
    session.workflow?.task_states.map((state) => [state.task_id, state]) ?? [],
  );
  const executionHistory = session.executionHistory ?? [];
  const executions = executionHistory.flatMap((result) => result.executions);
  const taskCounts = { ...emptyTaskCounts };

  for (const task of tasks) {
    const status = taskStateById.get(task.task_id)?.status ?? "pending";
    taskCounts[status] += 1;
  }

  const missionProgress = tasks.length
    ? Math.round((taskCounts.completed / tasks.length) * 100)
    : 0;
  const phases = (session.executionPlan?.phases ?? []).map((phase) => {
    const phaseTasks =
      taskGroups.find((group) => group.phase_id === phase.phase_number)?.tasks ?? [];
    const statuses = phaseTasks.map((task) => taskStateById.get(task.task_id)?.status ?? "pending");
    const completedTasks = statuses.filter((status) => status === "completed").length;
    const status = resolvePhaseStatus(statuses);

    return {
      completedTasks,
      completionPercentage: phaseTasks.length
        ? Math.round((completedTasks / phaseTasks.length) * 100)
        : 0,
      name: phase.phase_name,
      status,
      totalTasks: phaseTasks.length,
    };
  });
  const workers = (session.workerAssignmentResult?.workers ?? []).map((worker) => {
    const workerExecutions = executions.filter(
      (execution) => execution.worker_id === worker.worker_id,
    );
    const latestExecution = workerExecutions.at(-1);
    const status: DashboardWorkerStatus = latestExecution?.status ?? "waiting";

    return {
      assignedTaskCount: worker.assigned_tasks.length,
      completedTaskCount: workerExecutions.filter((execution) => execution.status === "completed")
        .length,
      department: worker.department,
      name: worker.worker_name,
      status,
      workerId: worker.worker_id,
    };
  });
  const workerCounts = { ...emptyWorkerCounts };
  for (const worker of workers) workerCounts[worker.status] += 1;

  const completedPhases = phases.filter((phase) => phase.status === "completed").length;
  const activePhase = phases.find((phase) => phase.status === "active")?.name ?? "—";
  const memoryEntries = session.organizationMemory?.entries ?? [];
  const artifacts = session.artifactCollection?.artifacts ?? [];
  const conversations = session.collaborationSession?.conversations ?? [];
  const collaborationMessages = conversations.flatMap((conversation) => conversation.messages);
  const messagesByDepartment = new Map<string, number>();
  const messagesByWorker = new Map<string, number>();
  for (const message of collaborationMessages) {
    messagesByDepartment.set(
      message.sender_department,
      (messagesByDepartment.get(message.sender_department) ?? 0) + 1,
    );
    messagesByWorker.set(
      message.sender_worker_id,
      (messagesByWorker.get(message.sender_worker_id) ?? 0) + 1,
    );
  }
  const mostActiveWorkerId = [...messagesByWorker].sort(
    ([leftWorkerId, leftCount], [rightWorkerId, rightCount]) =>
      rightCount - leftCount || leftWorkerId.localeCompare(rightWorkerId),
  )[0]?.[0];
  const mostActiveWorker = mostActiveWorkerId
    ? (session.workerAssignmentResult?.workers.find(
        (worker) => worker.worker_id === mostActiveWorkerId,
      )?.worker_name ?? mostActiveWorkerId)
    : "No collaboration yet";
  const artifactsByDepartment = new Map<string, number>();
  for (const artifact of artifacts) {
    artifactsByDepartment.set(
      artifact.department,
      (artifactsByDepartment.get(artifact.department) ?? 0) + 1,
    );
  }
  const latestMemoryEntry = [...memoryEntries].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  )[0];
  const workspaceFiles = session.projectWorkspace
    ? flattenWorkspaceFiles(session.projectWorkspace.root_folder)
    : [];
  const workspaceByDepartment = new Map<string, number>();
  for (const file of workspaceFiles) {
    workspaceByDepartment.set(
      file.department,
      (workspaceByDepartment.get(file.department) ?? 0) + 1,
    );
  }

  return {
    activity: createActivity(session, executions),
    artifacts: {
      byDepartment: [...artifactsByDepartment]
        .map(([department, count]) => ({ department, count }))
        .sort(
          (left, right) =>
            right.count - left.count || left.department.localeCompare(right.department),
        ),
      recent: [...artifacts]
        .sort((left, right) => right.generated_at.localeCompare(left.generated_at))
        .slice(0, 6),
      total: artifacts.length,
    },
    collaboration: {
      activeSessions: conversations.length ? 1 : 0,
      messagesByDepartment: [...messagesByDepartment]
        .map(([department, count]) => ({ department, count }))
        .sort(
          (left, right) =>
            right.count - left.count || left.department.localeCompare(right.department),
        ),
      mostActiveWorker,
      recent: [...collaborationMessages]
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, 6),
      totalConversations: collaborationMessages.length,
    },
    estimatedRemainingTime: estimateRemainingTime(tasks, taskStateById),
    execution: {
      activePhase,
      completed: completedPhases,
      remaining: phases.length - completedPhases,
      total: phases.length,
    },
    latestMemoryEntry: latestMemoryEntry?.summary ?? "No memory entries yet.",
    memory: { total: memoryEntries.length },
    missionProgress,
    missionStatus: resolveMissionStatus(taskCounts, tasks.length),
    phases,
    validation: {
      criticalIssues: session.validationReport?.health.critical_issues ?? 0,
      healthScore: session.validationReport?.health.score ?? 0,
      status: session.validationReport?.health.status ?? "pending",
      totalIssues: session.validationReport?.issues.length ?? 0,
      warnings: session.validationReport?.health.warnings ?? 0,
    },
    verification: {
      buildSuccessRate: session.verificationReport
        ? session.verificationReport.sandbox_run.build_status === "passed"
          ? 100
          : 0
        : 0,
      lastVerificationTime: session.verificationReport?.sandbox_run.finished_at ?? "",
      implementationLevel:
        session.verificationReport?.sandbox_run.implementation_level ?? "pending",
      status: session.verificationReport?.sandbox_run.status ?? "pending",
    },
    review: {
      pendingSuggestions:
        session.projectReview?.suggestions.filter((suggestion) => suggestion.status === "pending")
          .length ?? 0,
      resolvedSuggestions:
        session.projectReview?.suggestions.filter((suggestion) => suggestion.status === "resolved")
          .length ?? 0,
      score: session.projectReview?.overall_score ?? null,
      totalSuggestions: session.projectReview?.suggestions.length ?? 0,
    },
    deployment: {
      isReady: session.deploymentPlan?.status === "ready",
      missingConfiguration: session.deploymentPlan?.missing_configuration ?? [],
      runtimeStatus: session.deploymentPlan?.runtime_status ?? "pending",
      status: session.deploymentPlan?.status ?? "pending",
    },
    packaging: {
      downloadCount: 0,
      exportStatus: session.projectPackage?.build_status ?? "pending",
      latestPackage: session.projectPackage?.project_name ?? "Awaiting workspace",
      packageSize: session.projectPackage?.total_size ?? 0,
    },
    taskCounts,
    totalExecutionTimeMs: executions.reduce(
      (total, execution) => total + execution.execution_duration_ms,
      0,
    ),
    workers,
    workerCounts,
    workspace: {
      buildStatus: session.projectWorkspace?.build_status ?? "pending",
      largestDepartments: [...workspaceByDepartment]
        .map(([department, count]) => ({ department, count }))
        .sort(
          (left, right) =>
            right.count - left.count || left.department.localeCompare(right.department),
        )
        .slice(0, 4),
      projectName: session.projectWorkspace?.project_name ?? "Awaiting artifacts",
      projectSize: workspaceFiles.reduce((total, file) => total + file.file_content.length, 0),
      totalFiles: session.projectWorkspace?.total_files ?? 0,
      totalFolders: session.projectWorkspace?.total_folders ?? 0,
      totalSourceFiles: workspaceFiles.filter((file) => isSourceFile(file.file_name)).length,
    },
  };
}

function flattenWorkspaceFiles(folder: WorkspaceFolder): WorkspaceFile[] {
  return [
    ...folder.child_files,
    ...folder.child_folders.flatMap((childFolder) => flattenWorkspaceFiles(childFolder)),
  ];
}

function isSourceFile(fileName: string): boolean {
  return /\.(?:css|html|js|jsx|py|sql|ts|tsx|yaml|yml)$/i.test(fileName);
}

function resolvePhaseStatus(statuses: WorkflowTaskStatus[]): DashboardPhase["status"] {
  if (statuses.length === 0) return "pending";
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.some((status) => status === "failed")) return "failed";
  if (statuses.some((status) => status === "running" || status === "ready")) return "active";
  if (statuses.every((status) => status === "blocked")) return "blocked";
  return "pending";
}

function resolveMissionStatus(
  taskCounts: Record<WorkflowTaskStatus, number>,
  totalTasks: number,
): DashboardMissionStatus {
  if (totalTasks === 0) return "preparing";
  if (taskCounts.failed > 0) return "failed";
  if (taskCounts.completed === totalTasks) return "completed";
  if (taskCounts.running > 0 || taskCounts.ready > 0) return "active";
  if (taskCounts.blocked > 0) return "blocked";
  return "preparing";
}

function estimateRemainingTime(
  tasks: Task[],
  taskStateById: Map<string, { status: WorkflowTaskStatus }>,
): string {
  const remainingDays = tasks
    .filter((task) => taskStateById.get(task.task_id)?.status !== "completed")
    .reduce((total, task) => total + (Number.parseInt(task.estimated_duration, 10) || 0), 0);

  if (remainingDays === 0) return "Complete";
  return `~${remainingDays} ${remainingDays === 1 ? "day" : "days"}`;
}

function createActivity(
  session: MissionControlSession,
  executions: WorkerExecution[],
): DashboardActivity[] {
  const events: DashboardActivity[] = [
    {
      detail: "Mission accepted by Genesis.",
      timestamp: session.createdAt,
      title: "Mission Created",
    },
    {
      detail: "Organization blueprint approved.",
      timestamp: session.createdAt,
      title: "Organization Created",
    },
  ];

  if (session.executionPlan) {
    events.push({
      detail: "Department execution sequence prepared.",
      timestamp: session.createdAt,
      title: "Execution Plan Generated",
    });
  }
  if (session.taskGroups) {
    events.push({
      detail: "Phase task backlogs generated.",
      timestamp: session.createdAt,
      title: "Tasks Generated",
    });
  }
  if (session.workerAssignmentResult) {
    events.push({
      detail: "Workers mapped to generated tasks.",
      timestamp: session.createdAt,
      title: "Workers Assigned",
    });
  }
  if (session.workflow) {
    events.push({
      detail: "Dependency-aware task states initialized.",
      timestamp: session.createdAt,
      title: "Workflow Initialized",
    });
  }
  for (const execution of executions.filter((item) => item.status === "completed")) {
    events.push({
      detail: execution.output_summary,
      timestamp: execution.end_time,
      title: "Task Completed",
    });
    events.push({
      detail: execution.worker_id,
      timestamp: execution.end_time,
      title: "Worker Finished Task",
    });
  }
  for (const entry of session.organizationMemory?.entries ?? []) {
    events.push({ detail: entry.title, timestamp: entry.timestamp, title: "Memory Created" });
  }
  for (const artifact of session.artifactCollection?.artifacts ?? []) {
    events.push({
      detail: artifact.artifact_name,
      timestamp: artifact.generated_at,
      title: "Artifact Generated",
    });
  }
  if (session.projectWorkspace) {
    events.push({
      detail: `${session.projectWorkspace.total_files} files organized into a repository.`,
      timestamp: session.projectWorkspace.last_updated,
      title: "Project Workspace Generated",
    });
  }
  if (session.projectPackage) {
    events.push({
      detail: `${session.projectPackage.total_files} files bundled for export.`,
      timestamp: session.projectPackage.created_at,
      title: "Project Package Generated",
    });
  }
  if (session.validationReport) {
    events.push({
      detail: `Project health: ${session.validationReport.health.score}%.`,
      timestamp: session.validationReport.created_at,
      title: "Project Validated",
    });
  }
  if (session.verificationReport) {
    events.push({
      detail: session.verificationReport.sandbox_run.verification_summary,
      timestamp: session.verificationReport.sandbox_run.finished_at,
      title: "Project Verified",
    });
  }
  if (session.projectReview) {
    events.push({
      detail: `${session.projectReview.suggestions.length} review suggestions recorded.`,
      timestamp: session.projectReview.created_at,
      title: "Project Reviewed",
    });
  }
  for (const refinementRequest of session.refinementRequests ?? []) {
    events.push({
      detail: refinementRequest.summary,
      timestamp: refinementRequest.created_at,
      title: "Project Refinement Applied",
    });
  }
  if (session.deploymentPlan) {
    events.push({
      detail: `${session.deploymentPlan.deployment_assets.length} deployment assets prepared.`,
      timestamp: session.deploymentPlan.created_at,
      title: "Deployment Assets Generated",
    });
  }
  for (const message of session.collaborationSession?.conversations.flatMap(
    (conversation) => conversation.messages,
  ) ?? []) {
    events.push({
      detail: message.content,
      timestamp: message.timestamp,
      title: "Collaboration Message",
    });
  }

  return events.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}
