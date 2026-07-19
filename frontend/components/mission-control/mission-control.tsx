"use client";

import Link from "next/link";
import { AnimatePresence, motion as motionElement } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { Badge, Chip } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, Panel } from "@/components/design-system/card";
import {
  EmptyState,
  LoadingIndicator,
  NotificationToast,
} from "@/components/design-system/feedback";
import { PageContainer, SectionHeader, TopNavigation } from "@/components/design-system/layout";
import { TimelineCard } from "@/components/design-system/organization";
import { ProgressBar } from "@/components/design-system/progress";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MissionArtifacts } from "@/components/mission-control/mission-artifacts";
import { ProjectExportPanel } from "@/components/mission-control/project-export";
import { ProjectValidationPanel } from "@/components/mission-control/project-validation";
import { ProjectVerificationPanel } from "@/components/mission-control/project-verification";
import { ProjectReviewPanel } from "@/components/mission-control/project-review";
import { ProjectDeploymentPanel } from "@/components/mission-control/project-deployment";
import { ProjectWorkspacePanel } from "@/components/mission-control/project-workspace";
import { TeamCollaboration } from "@/components/mission-control/team-collaboration";
import { type ArtifactCollection, requestArtifacts } from "@/lib/api/artifacts";
import {
  CollaborationApiError,
  type CollaborativeExecutionResult,
  executeCollaborativeReadyTasks,
} from "@/lib/api/collaboration";
import { ExecutionPlannerApiError, requestExecutionPlan } from "@/lib/api/execution-planner";
import {
  type ExecutionResult,
  type ExecutionStatus,
  type ProviderHealth,
  type WorkerExecution,
} from "@/lib/api/execution";
import { TaskGeneratorApiError, requestTaskGroups } from "@/lib/api/task-generator";
import {
  requestWorkerAssignments,
  WorkerAssignmentApiError,
  type WorkerAssignmentResult,
} from "@/lib/api/worker-assignment";
import {
  requestWorkflow,
  WorkflowApiError,
  type Workflow,
  type WorkflowTaskStatus,
} from "@/lib/api/workflow";
import { requestWorkspace, WorkspaceApiError } from "@/lib/api/workspace";
import {
  ProjectPackagingApiError,
  requestProjectPackage,
  type ExportBundle,
} from "@/lib/api/packaging";
import {
  ProjectValidationApiError,
  requestProjectValidation,
  type ValidationReport,
} from "@/lib/api/validation";
import {
  ProjectVerificationApiError,
  requestProjectVerification,
  type VerificationReport,
} from "@/lib/api/verification";
import {
  ProjectReviewApiError,
  requestProjectRefinement,
  requestProjectReview,
  type ProjectRefinementResult,
  type ProjectReview,
} from "@/lib/api/project-review";
import {
  DeploymentGenerationApiError,
  requestDeploymentPlan,
  type DeploymentPlan,
} from "@/lib/api/deployment";
import { requestSystemHealth, SystemHealthApiError } from "@/lib/api/system-health";
import { icons } from "@/lib/icons";
import { slideUp } from "@/lib/motion";
import { createPackageManifestContext } from "@/lib/package-manifest";
import { createProjectValidationInput } from "@/lib/project-validation";
import { createProjectVerificationInput } from "@/lib/project-verification";
import { createProjectRefinementInput, createProjectReviewInput } from "@/lib/project-review";
import { createDeploymentGenerationInput } from "@/lib/project-deployment";
import {
  formatMissionControlTime,
  readMissionControlSession,
  saveArtifactCollection,
  saveCollaborationSession,
  saveExecutionPlan,
  saveExecutionResult,
  saveProjectPackage,
  saveProjectRefinementResult,
  saveProjectReview,
  saveProjectWorkspace,
  saveDeploymentPlan,
  saveTaskGroups,
  saveWorkerAssignmentResult,
  saveValidationReport,
  saveVerificationReport,
  saveWorkflow,
  type MissionControlSession,
} from "@/lib/mission-control-session";

type SessionState = MissionControlSession | null | undefined;
type BackgroundStageStatus = "active" | "complete" | "deferred" | "pending" | "waiting" | "error";

type BackgroundStage = {
  description: string;
  label: string;
  status: BackgroundStageStatus;
};

async function retryOnce<Result>(operation: () => Promise<Result>): Promise<Result | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (isDeferredCollaborationError(error)) throw error;

    try {
      return await operation();
    } catch (retryError) {
      if (isDeferredCollaborationError(retryError)) throw retryError;

      return undefined;
    }
  }
}

function isDeferredCollaborationError(error: unknown): error is CollaborationApiError {
  return (
    error instanceof CollaborationApiError && error.code === "collaborative_execution_deferred"
  );
}

function BackgroundGenerationProgress({
  stages,
}: Readonly<{ stages: BackgroundStage[] }>): React.JSX.Element {
  const completedStageCount = stages.filter((stage) => stage.status === "complete").length;
  const progress = Math.round((completedStageCount / stages.length) * 100);

  return (
    <Panel aria-live="polite" className="mt-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-label text-muted">Organization formation</p>
          <h2 className="text-title mt-1">Building the operating system in the background</h2>
          <p className="text-caption text-secondary mt-2">
            Explore the blueprint while Genesis prepares the deeper execution layers.
          </p>
        </div>
        <Badge tone={progress === 100 ? "success" : "info"}>
          {progress === 100 ? "Organization ready" : "Background generation"}
        </Badge>
      </div>
      <ProgressBar className="mt-5" label="Preparation progress" value={progress} />
      <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {stages.map((stage) => {
            const Icon =
              stage.status === "complete"
                ? icons.complete
                : stage.status === "error"
                  ? icons.alert
                  : stage.status === "active"
                    ? icons.loading
                    : icons.pending;
            const tone =
              stage.status === "complete"
                ? "success"
                : stage.status === "error"
                  ? "danger"
                  : "info";

            return (
              <motionElement.li
                animate="visible"
                className="border-border bg-surface rounded-lg border p-3"
                initial="hidden"
                key={stage.label}
                variants={slideUp}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className={stage.status === "active" ? "animate-soft-spin" : undefined}
                    size={16}
                  />
                  <p className="text-body font-medium">{stage.label}</p>
                  <Badge className="ml-auto capitalize" tone={tone}>
                    {stage.status}
                  </Badge>
                </div>
                <p className="text-caption text-secondary mt-2">{stage.description}</p>
              </motionElement.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </Panel>
  );
}

function SummaryCard({
  children,
  label,
}: Readonly<{ children: React.ReactNode; label: string }>): React.JSX.Element {
  return (
    <Card className="p-4">
      <p className="text-label text-muted">{label}</p>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

function AssignedWorker({
  assignmentResult,
  taskId,
}: Readonly<{
  assignmentResult: WorkerAssignmentResult;
  taskId: string;
}>): React.JSX.Element | null {
  const assignment = assignmentResult.assignments.find((item) => item.task_id === taskId);
  const worker = assignment
    ? assignmentResult.workers.find((item) => item.worker_id === assignment.worker_id)
    : undefined;

  if (!worker) return null;

  return (
    <div className="border-border mt-3 border-t pt-3">
      <p className="text-label text-muted">Assigned worker</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-caption font-medium">{worker.worker_name}</span>
        <Badge className="capitalize" tone="info">
          {worker.current_status}
        </Badge>
      </div>
      <p className="text-caption text-secondary mt-1">{worker.role}</p>
    </div>
  );
}

const workflowStatusTone: Record<
  WorkflowTaskStatus,
  "neutral" | "success" | "info" | "warning" | "danger"
> = {
  blocked: "warning",
  completed: "success",
  failed: "danger",
  pending: "neutral",
  ready: "success",
  running: "info",
};

function TaskWorkflowStatus({
  isInitializing,
  taskId,
  workflow,
}: Readonly<{
  isInitializing: boolean;
  taskId: string;
  workflow?: Workflow;
}>): React.JSX.Element {
  if (isInitializing) return <LoadingIndicator label="Initializing workflow" />;

  const taskState = workflow?.task_states.find((state) => state.task_id === taskId);
  const status = taskState?.status ?? "pending";

  return (
    <div className="mt-3">
      <Badge className="capitalize" tone={workflowStatusTone[status]}>
        {status}
      </Badge>
      {status === "blocked" && taskState?.blocked_by.length ? (
        <p className="text-caption text-muted mt-2">
          Waiting for: {taskState.blocked_by.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

const executionStatusTone: Record<ExecutionStatus | "waiting", "info" | "success" | "danger"> = {
  completed: "success",
  failed: "danger",
  running: "info",
  waiting: "info",
};

function latestExecutionForTask(
  executionHistory: ExecutionResult[] | undefined,
  taskId: string,
): WorkerExecution | undefined {
  return executionHistory
    ?.flatMap((result) => result.executions)
    .filter((execution) => execution.task_id === taskId)
    .at(-1);
}

function TaskExecutionDetail({
  execution,
}: Readonly<{ execution: WorkerExecution }>): React.JSX.Element {
  const completedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(execution.end_time));

  return (
    <div className="border-border mt-3 border-t pt-3">
      <p className="text-label text-muted">Execution result</p>
      <p className="text-caption text-secondary mt-1">{execution.output_summary}</p>
      <p className="text-caption text-muted mt-2">
        {execution.execution_duration_ms} ms · {completedAt}
      </p>
    </div>
  );
}

function TaskArtifactAttachment({
  artifactCollection,
  taskId,
}: Readonly<{
  artifactCollection?: ArtifactCollection;
  taskId: string;
}>): React.JSX.Element | null {
  const artifact = artifactCollection?.artifacts.find((item) => item.task_id === taskId);
  if (!artifact) return null;

  return (
    <div className="border-border mt-3 border-t pt-3">
      <p className="text-label text-muted">Generated artifact</p>
      <p className="text-caption text-secondary mt-1">
        {artifact.artifact_name} · {artifact.artifact_type}
      </p>
    </div>
  );
}

export function MissionControl(): React.JSX.Element {
  const [session, setSession] = useState<SessionState>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);
  const [autoPlanningAttempted, setAutoPlanningAttempted] = useState(false);
  const [autoExecutionSignature, setAutoExecutionSignature] = useState<string | null>(null);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [taskGenerationAttempted, setTaskGenerationAttempted] = useState(false);
  const [taskGeneratorError, setTaskGeneratorError] = useState<string | null>(null);
  const [isAssigningWorkers, setIsAssigningWorkers] = useState(false);
  const [workerAssignmentAttempted, setWorkerAssignmentAttempted] = useState(false);
  const [workerAssignmentError, setWorkerAssignmentError] = useState<string | null>(null);
  const [isInitializingWorkflow, setIsInitializingWorkflow] = useState(false);
  const [workflowAttempted, setWorkflowAttempted] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isExecutingReadyTasks, setIsExecutingReadyTasks] = useState(false);
  const [isAiWorkSlow, setIsAiWorkSlow] = useState(false);
  const [isAiWorkPending, setIsAiWorkPending] = useState(false);
  const [isCollaborativeExecutionDeferred, setIsCollaborativeExecutionDeferred] = useState(false);
  const [deferredExecutionSignature, setDeferredExecutionSignature] = useState<string | null>(null);
  const [automaticDeferredRetrySignature, setAutomaticDeferredRetrySignature] = useState<
    string | null
  >(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceErrorArtifactCount, setWorkspaceErrorArtifactCount] = useState<number | null>(
    null,
  );
  const [isGeneratingWorkspace, setIsGeneratingWorkspace] = useState(false);
  const [isPackagingProject, setIsPackagingProject] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [packageErrorWorkspaceUpdatedAt, setPackageErrorWorkspaceUpdatedAt] = useState<
    string | null
  >(null);
  const [exportBundle, setExportBundle] = useState<ExportBundle | undefined>(undefined);
  const [isValidatingProject, setIsValidatingProject] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationErrorPackageId, setValidationErrorPackageId] = useState<string | null>(null);
  const [isVerifyingProject, setIsVerifyingProject] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationErrorPackageId, setVerificationErrorPackageId] = useState<string | null>(null);
  const [isReviewingProject, setIsReviewingProject] = useState(false);
  const [autoReviewWorkspaceUpdatedAt, setAutoReviewWorkspaceUpdatedAt] = useState<string | null>(
    null,
  );
  const [isRefiningProject, setIsRefiningProject] = useState(false);
  const [projectReviewError, setProjectReviewError] = useState<string | null>(null);
  const [isGeneratingDeployment, setIsGeneratingDeployment] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentErrorPackageId, setDeploymentErrorPackageId] = useState<string | null>(null);
  const [activeMissionControlTab, setActiveMissionControlTab] = useState<
    "mission" | "workspace" | "validation" | "sandbox" | "review" | "deployment" | "export"
  >("mission");
  const [providerHealth, setProviderHealth] = useState<ProviderHealth | undefined>(undefined);
  const [providerError, setProviderError] = useState<string | null>(null);
  const BrandIcon = icons.organization;

  useEffect(() => setSession(readMissionControlSession()), []);

  useEffect(() => {
    void requestSystemHealth()
      .then((health) => {
        setProviderHealth(health.active_ai_provider);
        setProviderError(
          health.active_ai_provider.is_healthy ? null : health.active_ai_provider.error,
        );
      })
      .catch((error: unknown) => {
        setProviderError(
          error instanceof SystemHealthApiError
            ? error.message
            : "Genesis could not read startup diagnostics. Check the backend connection.",
        );
      });
  }, []);

  useEffect(() => {
    if (!isExecutingReadyTasks) {
      setIsAiWorkSlow(false);
      return;
    }

    const slowGenerationTimer = window.setTimeout(() => setIsAiWorkSlow(true), 30_000);
    return () => window.clearTimeout(slowGenerationTimer);
  }, [isExecutingReadyTasks]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.executionPlan ||
      session.taskGroups ||
      taskGenerationAttempted
    ) {
      return;
    }

    setTaskGenerationAttempted(true);
    setIsGeneratingTasks(true);
    setTaskGeneratorError(null);

    void requestTaskGroups(session.executionPlan)
      .then((taskGroups) => {
        const updatedSession = saveTaskGroups(taskGroups);
        setSession(updatedSession ?? { ...session, taskGroups });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof TaskGeneratorApiError
            ? error.message
            : "Genesis could not generate phase tasks. Please try again.";
        setTaskGeneratorError(message);
      })
      .finally(() => {
        setIsGeneratingTasks(false);
      });
  }, [session, taskGenerationAttempted]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.taskGroups ||
      session.workerAssignmentResult ||
      workerAssignmentAttempted
    ) {
      return;
    }

    setWorkerAssignmentAttempted(true);
    setIsAssigningWorkers(true);
    setWorkerAssignmentError(null);

    void requestWorkerAssignments(session.taskGroups)
      .then((workerAssignmentResult) => {
        const updatedSession = saveWorkerAssignmentResult(workerAssignmentResult);
        setSession(updatedSession ?? { ...session, workerAssignmentResult });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof WorkerAssignmentApiError
            ? error.message
            : "Genesis could not assign workers to phase tasks. Please try again.";
        setWorkerAssignmentError(message);
      })
      .finally(() => {
        setIsAssigningWorkers(false);
      });
  }, [session, workerAssignmentAttempted]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.workerAssignmentResult ||
      !session.taskGroups ||
      session.workflow ||
      workflowAttempted
    ) {
      return;
    }

    setWorkflowAttempted(true);
    setIsInitializingWorkflow(true);
    setWorkflowError(null);

    void requestWorkflow(session.taskGroups)
      .then((workflow) => {
        const updatedSession = saveWorkflow(workflow);
        setSession(updatedSession ?? { ...session, workflow });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof WorkflowApiError
            ? error.message
            : "Genesis could not initialize the task workflow. Please try again.";
        setWorkflowError(message);
      })
      .finally(() => {
        setIsInitializingWorkflow(false);
      });
  }, [session, workflowAttempted]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.artifactCollection?.artifacts.length ||
      !session.organizationMemory ||
      session.projectWorkspace?.total_files === session.artifactCollection.artifacts.length ||
      workspaceErrorArtifactCount === session.artifactCollection.artifacts.length
    ) {
      return;
    }

    let cancelled = false;
    setIsGeneratingWorkspace(true);
    setWorkspaceError(null);

    void requestWorkspace({
      artifactCollection: session.artifactCollection,
      existingWorkspace: session.projectWorkspace,
      organizationMemory: session.organizationMemory,
      projectName: session.blueprint.organization_name,
    })
      .then((result) => {
        if (cancelled) return;

        const updatedSession = saveProjectWorkspace(result.workspace, result.organization_memory);
        setWorkspaceErrorArtifactCount(null);
        setSession(
          updatedSession ?? {
            ...session,
            organizationMemory: result.organization_memory,
            projectWorkspace: result.workspace,
          },
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const message =
          error instanceof WorkspaceApiError
            ? `Workspace generation is deferred. ${error.message}`
            : "Workspace generation is deferred while Genesis continues preparing other sections.";
        setWorkspaceError(message);
        setWorkspaceErrorArtifactCount(session.artifactCollection?.artifacts.length ?? null);
      })
      .finally(() => {
        if (!cancelled) setIsGeneratingWorkspace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, workspaceErrorArtifactCount]);

  const packageProject = useCallback(
    async (packagingSession: MissionControlSession): Promise<ExportBundle | null> => {
      if (!packagingSession.projectWorkspace) return null;

      setPackageError(null);
      try {
        const bundle = await requestProjectPackage({
          manifestContext: createPackageManifestContext(packagingSession),
          workspace: packagingSession.projectWorkspace,
        });
        const updatedSession = saveProjectPackage(
          bundle.project_package,
          bundle.manifest,
          bundle.included_files,
        );
        setPackageErrorWorkspaceUpdatedAt(null);
        setExportBundle(bundle);
        setSession(
          updatedSession ?? {
            ...packagingSession,
            packageIncludedFiles: bundle.included_files,
            packageManifest: bundle.manifest,
            projectPackage: bundle.project_package,
          },
        );
        return bundle;
      } catch (error) {
        const message =
          error instanceof ProjectPackagingApiError
            ? `Project export is deferred. ${error.message}`
            : "Project export is deferred while Genesis continues preparing other sections.";
        setPackageError(message);
        setPackageErrorWorkspaceUpdatedAt(packagingSession.projectWorkspace.last_updated);
        return null;
      }
    },
    [],
  );

  const validateProject = useCallback(
    async (validationSession: MissionControlSession): Promise<ValidationReport | null> => {
      const validationInput = createProjectValidationInput(validationSession);
      if (!validationInput) return null;

      setValidationError(null);
      try {
        const validationReport = await requestProjectValidation(validationInput);
        const updatedSession = saveValidationReport(validationReport);
        setValidationErrorPackageId(null);
        setSession(updatedSession ?? { ...validationSession, validationReport });
        return validationReport;
      } catch (error) {
        const message =
          error instanceof ProjectValidationApiError
            ? `Validation is deferred. ${error.message}`
            : "Validation is deferred while Genesis continues preparing other sections.";
        setValidationError(message);
        setValidationErrorPackageId(validationInput.projectPackage.package_id);
        return null;
      }
    },
    [],
  );

  const verifyProject = useCallback(
    async (verificationSession: MissionControlSession): Promise<VerificationReport | null> => {
      const verificationInput = createProjectVerificationInput(verificationSession);
      if (!verificationInput) return null;

      setVerificationError(null);
      try {
        const verificationReport = await requestProjectVerification(verificationInput);
        const updatedSession = saveVerificationReport(verificationReport);
        setVerificationErrorPackageId(null);
        setSession(updatedSession ?? { ...verificationSession, verificationReport });
        return verificationReport;
      } catch (error) {
        const message =
          error instanceof ProjectVerificationApiError
            ? `Sandbox verification is deferred. ${error.message}`
            : "Sandbox verification is deferred while Genesis continues preparing other sections.";
        setVerificationError(message);
        setVerificationErrorPackageId(verificationInput.projectPackage.package_id);
        return null;
      }
    },
    [],
  );

  const reviewProject = useCallback(
    async (reviewSession: MissionControlSession): Promise<ProjectReview | null> => {
      const reviewInput = createProjectReviewInput(reviewSession);
      if (!reviewInput) return null;

      setProjectReviewError(null);
      try {
        const projectReview = await requestProjectReview(reviewInput);
        const updatedSession = saveProjectReview(projectReview);
        setSession(updatedSession ?? { ...reviewSession, projectReview });
        return projectReview;
      } catch (error) {
        const message =
          error instanceof ProjectReviewApiError
            ? `Project Review is deferred. ${error.message}`
            : "Project Review is deferred while Genesis continues preparing other sections.";
        setProjectReviewError(message);
        return null;
      }
    },
    [],
  );

  const generateDeployment = useCallback(
    async (deploymentSession: MissionControlSession): Promise<DeploymentPlan | null> => {
      const deploymentInput = createDeploymentGenerationInput(deploymentSession);
      if (!deploymentInput) return null;

      setDeploymentError(null);
      try {
        const deploymentPlan = await requestDeploymentPlan(deploymentInput);
        const updatedSession = saveDeploymentPlan(deploymentPlan);
        setDeploymentErrorPackageId(null);
        setSession(updatedSession ?? { ...deploymentSession, deploymentPlan });
        return deploymentPlan;
      } catch (error) {
        const message =
          error instanceof DeploymentGenerationApiError
            ? `Deployment generation is deferred. ${error.message}`
            : "Deployment generation is deferred while Genesis continues preparing other sections.";
        setDeploymentError(message);
        setDeploymentErrorPackageId(deploymentInput.projectPackage.package_id);
        return null;
      }
    },
    [],
  );

  const initializeExecutionPlan = useCallback(
    async (planningSession: MissionControlSession): Promise<void> => {
      if (planningSession.executionPlan) return;

      setIsInitializing(true);
      setPlannerError(null);

      try {
        const plan = await requestExecutionPlan(planningSession.blueprint);
        const updatedSession = saveExecutionPlan(plan);
        setSession(updatedSession ?? { ...planningSession, executionPlan: plan });
      } catch (error) {
        const message =
          error instanceof ExecutionPlannerApiError
            ? error.message
            : "Genesis could not create an execution plan. Please try again.";
        setPlannerError(message);
      } finally {
        setIsInitializing(false);
      }
    },
    [],
  );

  const executeReadyTasks = useCallback(
    async (executionSession: MissionControlSession): Promise<void> => {
      const { artifactCollection, collaborationSession, organizationMemory, taskGroups } =
        executionSession;
      const workerAssignmentResult = executionSession.workerAssignmentResult;
      const workflow = executionSession.workflow;
      const readyTaskCount =
        workflow?.task_states.filter((state) => state.status === "ready").length ?? 0;
      if (!workflow || !taskGroups || !workerAssignmentResult || readyTaskCount === 0) return;
      const readyTaskSignature = workflow.task_states
        .filter((state) => state.status === "ready")
        .map((state) => state.task_id)
        .sort()
        .join(",");

      setIsExecutingReadyTasks(true);
      setIsAiWorkSlow(false);
      setIsAiWorkPending(false);
      setIsCollaborativeExecutionDeferred(false);

      try {
        let collaborationResult: CollaborativeExecutionResult | undefined;
        try {
          collaborationResult = await retryOnce(() =>
            executeCollaborativeReadyTasks({
              artifactCollection,
              collaborationSession,
              organizationMemory,
              taskGroups,
              workerAssignmentResult,
              workflow,
            }),
          );
        } catch (error) {
          if (isDeferredCollaborationError(error)) {
            setDeferredExecutionSignature(readyTaskSignature);
            setIsCollaborativeExecutionDeferred(true);
            return;
          }

          setIsAiWorkPending(true);
          return;
        }
        if (!collaborationResult) {
          setIsAiWorkPending(true);
          return;
        }

        const executionResult = collaborationResult.execution_result;
        const updatedSession = saveExecutionResult(executionResult);
        const sessionWithExecution = updatedSession ?? {
          ...executionSession,
          executionHistory: [...(executionSession.executionHistory ?? []), executionResult],
          organizationMemory: executionResult.organization_memory,
          workflow: executionResult.workflow,
        };
        const savedCollaborationSession = saveCollaborationSession(
          collaborationResult.collaboration_session,
        );
        const sessionWithCollaboration = savedCollaborationSession ?? {
          ...sessionWithExecution,
          collaborationSession: collaborationResult.collaboration_session,
        };
        setSession(sessionWithCollaboration);

        const artifactResult = await retryOnce(() =>
          requestArtifacts({
            executionResult,
            taskGroups,
            workerAssignmentResult,
          }),
        );
        if (!artifactResult) {
          setIsAiWorkPending(true);
          return;
        }

        const sessionWithArtifacts = saveArtifactCollection(
          artifactResult.artifact_collection,
          artifactResult.organization_memory,
        );
        setSession(
          sessionWithArtifacts ?? {
            ...sessionWithCollaboration,
            artifactCollection: artifactResult.artifact_collection,
            organizationMemory: artifactResult.organization_memory,
          },
        );
      } finally {
        setIsExecutingReadyTasks(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.projectWorkspace ||
      (session.projectPackage?.source_workspace_id === session.projectWorkspace.workspace_id &&
        session.projectPackage.source_workspace_updated_at ===
          session.projectWorkspace.last_updated) ||
      packageErrorWorkspaceUpdatedAt === session.projectWorkspace.last_updated
    ) {
      return;
    }

    setIsPackagingProject(true);
    void packageProject(session).finally(() => setIsPackagingProject(false));
  }, [packageErrorWorkspaceUpdatedAt, packageProject, session]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.projectWorkspace ||
      !session.projectPackage ||
      isValidatingProject ||
      (session.validationReport?.source_package_id === session.projectPackage.package_id &&
        session.validationReport.source_workspace_id === session.projectWorkspace.workspace_id &&
        session.validationReport.source_workspace_updated_at ===
          session.projectWorkspace.last_updated) ||
      validationErrorPackageId === session.projectPackage.package_id
    ) {
      return;
    }

    setIsValidatingProject(true);
    void validateProject(session).finally(() => setIsValidatingProject(false));
  }, [isValidatingProject, session, validateProject, validationErrorPackageId]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.projectWorkspace ||
      !session.projectPackage ||
      isVerifyingProject ||
      (session.verificationReport?.source_package_id === session.projectPackage.package_id &&
        session.verificationReport.source_workspace_id === session.projectWorkspace.workspace_id &&
        session.verificationReport.source_workspace_updated_at ===
          session.projectWorkspace.last_updated) ||
      verificationErrorPackageId === session.projectPackage.package_id
    ) {
      return;
    }

    setIsVerifyingProject(true);
    void verifyProject(session).finally(() => setIsVerifyingProject(false));
  }, [isVerifyingProject, session, verificationErrorPackageId, verifyProject]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.projectPackage ||
      !session.packageManifest ||
      isGeneratingDeployment ||
      session.deploymentPlan?.package_id === session.projectPackage.package_id ||
      deploymentErrorPackageId === session.projectPackage.package_id
    ) {
      return;
    }

    setIsGeneratingDeployment(true);
    void generateDeployment(session).finally(() => setIsGeneratingDeployment(false));
  }, [deploymentErrorPackageId, generateDeployment, isGeneratingDeployment, session]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      session.executionPlan ||
      isInitializing ||
      autoPlanningAttempted
    ) {
      return;
    }

    setAutoPlanningAttempted(true);
    void initializeExecutionPlan(session);
  }, [autoPlanningAttempted, initializeExecutionPlan, isInitializing, session]);

  useEffect(() => {
    if (session === undefined || session === null || isExecutingReadyTasks) return;

    const readyTaskIds = session.workflow?.task_states
      .filter((state) => state.status === "ready")
      .map((state) => state.task_id)
      .sort();
    const readyTaskSignature = readyTaskIds?.join(",") ?? "";
    if (
      !readyTaskSignature ||
      readyTaskSignature === autoExecutionSignature ||
      !session.taskGroups ||
      !session.workerAssignmentResult
    ) {
      return;
    }

    setAutoExecutionSignature(readyTaskSignature);
    void executeReadyTasks(session);
  }, [autoExecutionSignature, executeReadyTasks, isExecutingReadyTasks, session]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !isCollaborativeExecutionDeferred ||
      !deferredExecutionSignature ||
      deferredExecutionSignature === automaticDeferredRetrySignature ||
      isExecutingReadyTasks
    ) {
      return;
    }

    const readyTaskSignature = session.workflow?.task_states
      .filter((state) => state.status === "ready")
      .map((state) => state.task_id)
      .sort()
      .join(",");
    if (
      readyTaskSignature !== deferredExecutionSignature ||
      !session.taskGroups ||
      !session.workerAssignmentResult
    ) {
      return;
    }

    const retryTimer = window.setTimeout(() => {
      setAutomaticDeferredRetrySignature(deferredExecutionSignature);
      void executeReadyTasks(session);
    }, 1_000);
    return () => window.clearTimeout(retryTimer);
  }, [
    automaticDeferredRetrySignature,
    deferredExecutionSignature,
    executeReadyTasks,
    isCollaborativeExecutionDeferred,
    isExecutingReadyTasks,
    session,
  ]);

  useEffect(() => {
    if (
      session === undefined ||
      session === null ||
      !session.projectWorkspace ||
      isReviewingProject ||
      session.projectReview?.source_workspace_updated_at ===
        session.projectWorkspace.last_updated ||
      autoReviewWorkspaceUpdatedAt === session.projectWorkspace.last_updated
    ) {
      return;
    }

    setAutoReviewWorkspaceUpdatedAt(session.projectWorkspace.last_updated);
    setIsReviewingProject(true);
    void reviewProject(session).finally(() => setIsReviewingProject(false));
  }, [autoReviewWorkspaceUpdatedAt, isReviewingProject, reviewProject, session]);

  if (session === undefined) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <LoadingIndicator label="Opening Mission Control" />
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center px-5">
        <div className="max-w-reading w-full">
          <EmptyState
            description="Launch an organization from Genesis before opening its Mission Control."
            title="Mission Control is awaiting an organization"
          />
        </div>
      </main>
    );
  }

  const activeSession: MissionControlSession = session;
  const { blueprint, createdAt } = activeSession;
  const creationTime = formatMissionControlTime(createdAt);
  const executionPlan = session.executionPlan;
  const taskGroups = session.taskGroups;
  const workerAssignmentResult = session.workerAssignmentResult;
  const workflow = session.workflow;
  const executionHistory = session.executionHistory;
  const organizationMemory = session.organizationMemory;
  const artifactCollection = session.artifactCollection;
  const collaborationSession = session.collaborationSession;
  const projectWorkspace = session.projectWorkspace;
  const projectPackage = session.projectPackage;
  const packageManifest = session.packageManifest;
  const packageIncludedFiles = session.packageIncludedFiles;
  const validationReport = session.validationReport;
  const verificationReport = session.verificationReport;
  const projectReview = session.projectReview;
  const refinementRequests = session.refinementRequests;
  const deploymentPlan = session.deploymentPlan;
  const isProjectReviewCurrent = Boolean(
    projectReview &&
    projectWorkspace &&
    projectReview.source_workspace_id === projectWorkspace.workspace_id &&
    projectReview.source_workspace_updated_at === projectWorkspace.last_updated,
  );
  const readyTaskCount =
    workflow?.task_states.filter((state) => state.status === "ready").length ?? 0;
  const backgroundStages: BackgroundStage[] = [
    {
      label: "Execution timeline",
      description: executionPlan
        ? "Department phases are available to explore."
        : "Sequencing departments from the approved blueprint.",
      status: plannerError ? "error" : executionPlan ? "complete" : "active",
    },
    {
      label: "Tasks and workers",
      description: workflow
        ? "Tasks, dependencies, and worker assignments are live."
        : "Preparing task groups and specialist assignments.",
      status:
        taskGeneratorError || workerAssignmentError || workflowError
          ? "error"
          : workflow
            ? "complete"
            : executionPlan
              ? "active"
              : "waiting",
    },
    {
      label: "AI work and artifacts",
      description: artifactCollection?.artifacts.length
        ? isExecutingReadyTasks
          ? `${artifactCollection.artifacts.length} project foundation artifacts are available while the remaining work continues in the background.`
          : `${artifactCollection.artifacts.length} project foundation artifacts are available.`
        : isCollaborativeExecutionDeferred
          ? "Large collaborative artifacts are still being generated. You can continue using Genesis while generation resumes in the background."
          : isAiWorkPending
            ? "Will retry automatically."
            : isAiWorkSlow
              ? "Generation is continuing in the background. Completed artifacts will appear here immediately."
              : "Workers will produce mission artifacts as phases become ready.",
      status: isExecutingReadyTasks
        ? "active"
        : artifactCollection?.artifacts.length
          ? "complete"
          : isCollaborativeExecutionDeferred
            ? "deferred"
            : isAiWorkPending
              ? "pending"
              : "waiting",
    },
    {
      label: "Workspace",
      description: workspaceError
        ? "Deferred. Existing artifacts remain available while this repository build is retried."
        : projectWorkspace
          ? "Project foundation is organized into a browseable repository."
          : "Organizing the completed project foundation.",
      status: workspaceError
        ? "deferred"
        : projectWorkspace
          ? "complete"
          : isGeneratingWorkspace
            ? "active"
            : "waiting",
    },
    {
      label: "Project export",
      description: packageError
        ? "Deferred. The workspace remains available while packaging is retried."
        : projectPackage
          ? "Portable project package is ready."
          : "Packaging the available repository foundation.",
      status: packageError
        ? "deferred"
        : projectPackage
          ? "complete"
          : isPackagingProject
            ? "active"
            : "waiting",
    },
    {
      label: "Validation",
      description: validationError
        ? "Deferred. Other workspace sections continue independently."
        : validationReport
          ? "Structural project checks are complete."
          : "Checking the current project structure.",
      status: validationError
        ? "deferred"
        : validationReport
          ? "complete"
          : isValidatingProject
            ? "active"
            : "waiting",
    },
    {
      label: "Sandbox verification",
      description: verificationError
        ? "Deferred. Other workspace sections continue independently."
        : verificationReport
          ? "Foundation verification is complete."
          : "Verifying the package structure safely.",
      status: verificationError
        ? "deferred"
        : verificationReport
          ? "complete"
          : isVerifyingProject
            ? "active"
            : "waiting",
    },
    {
      label: "Project review",
      description: projectReviewError
        ? "Deferred. Existing workspace and quality results remain available."
        : isProjectReviewCurrent
          ? "A focused review is available for this workspace revision."
          : "Reviewing the current workspace independently.",
      status: projectReviewError
        ? "deferred"
        : isProjectReviewCurrent
          ? "complete"
          : isReviewingProject
            ? "active"
            : "waiting",
    },
    {
      label: "Deployment",
      description: deploymentError
        ? "Deferred. The package remains available for export."
        : deploymentPlan
          ? "Deployment runtime assets are ready."
          : "Preparing the deployment overlay from the package.",
      status: deploymentError
        ? "deferred"
        : deploymentPlan
          ? "complete"
          : isGeneratingDeployment
            ? "active"
            : "waiting",
    },
  ];

  async function requestVerifiedPackage(): Promise<ExportBundle | null> {
    if (
      exportBundle &&
      validationReport &&
      verificationReport &&
      exportBundle.project_package.package_id === projectPackage?.package_id &&
      validationReport.source_package_id === projectPackage?.package_id &&
      validationReport.source_workspace_id === projectPackage?.source_workspace_id &&
      validationReport.source_workspace_updated_at ===
        projectPackage?.source_workspace_updated_at &&
      verificationReport.source_package_id === projectPackage?.package_id &&
      verificationReport.source_workspace_id === projectPackage?.source_workspace_id &&
      verificationReport.source_workspace_updated_at === projectPackage?.source_workspace_updated_at
    ) {
      return exportBundle;
    }

    setIsPackagingProject(true);
    try {
      const bundle = await packageProject(activeSession);
      if (!bundle) return null;

      const validationSession: MissionControlSession = {
        ...activeSession,
        packageIncludedFiles: bundle.included_files,
        packageManifest: bundle.manifest,
        projectPackage: bundle.project_package,
      };
      setIsValidatingProject(true);
      const validationResult = await validateProject(validationSession);
      if (!validationResult) return null;

      const verificationSession: MissionControlSession = {
        ...validationSession,
        validationReport: validationResult,
      };
      setIsVerifyingProject(true);
      const verificationResult = await verifyProject(verificationSession);
      return verificationResult ? bundle : null;
    } finally {
      setIsPackagingProject(false);
      setIsValidatingProject(false);
      setIsVerifyingProject(false);
    }
  }

  async function runProjectValidation(): Promise<ValidationReport | null> {
    setIsValidatingProject(true);
    try {
      return await validateProject(activeSession);
    } finally {
      setIsValidatingProject(false);
    }
  }

  async function runProjectVerification(): Promise<VerificationReport | null> {
    setIsVerifyingProject(true);
    try {
      return await verifyProject(activeSession);
    } finally {
      setIsVerifyingProject(false);
    }
  }

  async function runProjectReview(): Promise<ProjectReview | null> {
    setIsReviewingProject(true);
    try {
      return await reviewProject(activeSession);
    } finally {
      setIsReviewingProject(false);
    }
  }

  async function runDeploymentGeneration(): Promise<DeploymentPlan | null> {
    setIsGeneratingDeployment(true);
    try {
      return await generateDeployment(activeSession);
    } finally {
      setIsGeneratingDeployment(false);
    }
  }

  async function refineProjectArtifacts(
    selectedSuggestionIds: string[],
  ): Promise<ProjectRefinementResult | null> {
    if (!projectReview) return null;

    const refinementInput = createProjectRefinementInput(
      activeSession,
      projectReview,
      selectedSuggestionIds,
    );
    if (!refinementInput) return null;

    setIsRefiningProject(true);
    setProjectReviewError(null);
    try {
      const result = await requestProjectRefinement(refinementInput);
      const updatedSession = saveProjectRefinementResult(result);
      if (updatedSession) {
        setSession(updatedSession);
      }
      return result;
    } catch (error) {
      const message =
        error instanceof ProjectReviewApiError
          ? error.message
          : "Genesis could not refine the selected artifacts. Please try again.";
      setProjectReviewError(message);
      return null;
    } finally {
      setIsRefiningProject(false);
    }
  }

  async function initializeExecution(): Promise<void> {
    if (executionPlan || isInitializing) return;
    await initializeExecutionPlan(activeSession);
  }

  async function runReadyTasks(): Promise<void> {
    await executeReadyTasks(activeSession);
  }

  return (
    <main className="bg-background min-h-screen">
      <TopNavigation>
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <BrandIcon aria-hidden="true" size={15} />
          </span>
          <span className="text-title">Genesis</span>
          <span className="text-caption text-muted">Mission Control</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="text-caption text-secondary hover:text-foreground"
            href="/mission-dashboard"
          >
            Live Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </TopNavigation>
      <PageContainer>
        <section aria-labelledby="mission-control-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-label text-muted">Organization Name</p>
              <h1 className="text-heading mt-2" id="mission-control-title">
                {blueprint.organization_name}
              </h1>
              <p className="text-label text-muted mt-4">Mission Name</p>
              <p className="max-w-reading text-body text-secondary mt-2">
                {blueprint.mission_summary}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={executionPlan ? "success" : "info"}>
                {executionPlan
                  ? "Execution timeline ready"
                  : isInitializing
                    ? "Planning in background"
                    : "Preparing organization"}
              </Badge>
              <Badge tone={providerHealth?.is_healthy === false ? "danger" : "info"}>
                Provider: {providerHealth?.provider_name ?? "Checking..."}
              </Badge>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Mission status">
              <Badge tone={executionPlan ? "success" : "info"}>
                {executionPlan ? "In formation" : "Preparing"}
              </Badge>
            </SummaryCard>
            <SummaryCard label="Organization type">
              <p className="text-body font-medium">{blueprint.organization_type}</p>
            </SummaryCard>
            <SummaryCard label="Culture">
              <Chip>{blueprint.suggested_culture}</Chip>
            </SummaryCard>
            <SummaryCard label="Creation time">
              <p className="text-body text-secondary">{creationTime}</p>
            </SummaryCard>
            <SummaryCard label="Estimated Project Duration">
              <p className="text-body text-secondary">{blueprint.estimated_duration}</p>
            </SummaryCard>
          </div>
          <BackgroundGenerationProgress stages={backgroundStages} />
          {providerError ? <NotificationToast message={providerError} tone="danger" /> : null}
        </section>
        <div className="border-border mt-8 flex gap-4 border-b" role="tablist">
          <button
            aria-controls="mission-overview-panel"
            aria-selected={activeMissionControlTab === "mission"}
            className={`text-caption focus-visible:outline-focus border-b-2 px-1 pb-3 font-medium transition-colors ${
              activeMissionControlTab === "mission"
                ? "border-primary text-foreground"
                : "text-secondary hover:text-foreground border-transparent"
            }`}
            onClick={() => setActiveMissionControlTab("mission")}
            id="mission-overview-tab"
            role="tab"
            type="button"
          >
            Mission Overview
          </button>
          <button
            aria-controls="project-workspace-panel"
            aria-selected={activeMissionControlTab === "workspace"}
            className={`text-caption focus-visible:outline-focus border-b-2 px-1 pb-3 font-medium transition-colors ${
              activeMissionControlTab === "workspace"
                ? "border-primary text-foreground"
                : "text-secondary hover:text-foreground border-transparent"
            }`}
            onClick={() => setActiveMissionControlTab("workspace")}
            id="project-workspace-tab"
            role="tab"
            type="button"
          >
            Project Workspace
          </button>
          <button
            aria-controls="project-validation-panel"
            aria-selected={activeMissionControlTab === "validation"}
            className={`text-caption focus-visible:outline-focus border-b-2 px-1 pb-3 font-medium transition-colors ${
              activeMissionControlTab === "validation"
                ? "border-primary text-foreground"
                : "text-secondary hover:text-foreground border-transparent"
            }`}
            id="project-validation-tab"
            onClick={() => setActiveMissionControlTab("validation")}
            role="tab"
            type="button"
          >
            Validation Report
          </button>
          <button
            aria-controls="project-verification-panel"
            aria-selected={activeMissionControlTab === "sandbox"}
            className={`text-caption focus-visible:outline-focus border-b-2 px-1 pb-3 font-medium transition-colors ${
              activeMissionControlTab === "sandbox"
                ? "border-primary text-foreground"
                : "text-secondary hover:text-foreground border-transparent"
            }`}
            id="project-verification-tab"
            onClick={() => setActiveMissionControlTab("sandbox")}
            role="tab"
            type="button"
          >
            Sandbox Verification
          </button>
          <button
            aria-controls="project-review-panel"
            aria-selected={activeMissionControlTab === "review"}
            className={`text-caption focus-visible:outline-focus border-b-2 px-1 pb-3 font-medium transition-colors ${
              activeMissionControlTab === "review"
                ? "border-primary text-foreground"
                : "text-secondary hover:text-foreground border-transparent"
            }`}
            id="project-review-tab"
            onClick={() => setActiveMissionControlTab("review")}
            role="tab"
            type="button"
          >
            Project Review
          </button>
          <button
            aria-controls="project-deployment-panel"
            aria-selected={activeMissionControlTab === "deployment"}
            className={`text-caption focus-visible:outline-focus border-b-2 px-1 pb-3 font-medium transition-colors ${
              activeMissionControlTab === "deployment"
                ? "border-primary text-foreground"
                : "text-secondary hover:text-foreground border-transparent"
            }`}
            id="project-deployment-tab"
            onClick={() => setActiveMissionControlTab("deployment")}
            role="tab"
            type="button"
          >
            Deployment
          </button>
          <button
            aria-controls="project-export-panel"
            aria-selected={activeMissionControlTab === "export"}
            className={`text-caption focus-visible:outline-focus border-b-2 px-1 pb-3 font-medium transition-colors ${
              activeMissionControlTab === "export"
                ? "border-primary text-foreground"
                : "text-secondary hover:text-foreground border-transparent"
            }`}
            id="project-export-tab"
            onClick={() => setActiveMissionControlTab("export")}
            role="tab"
            type="button"
          >
            Project Export
          </button>
        </div>
        <section
          aria-labelledby="project-workspace-tab"
          className="mt-6"
          hidden={activeMissionControlTab !== "workspace"}
          id="project-workspace-panel"
          role="tabpanel"
        >
          <SectionHeader
            description="A structured repository assembled from the organization’s completed artifacts."
            title="Project Workspace"
          />
          {isGeneratingWorkspace ? <LoadingIndicator label="Assembling project workspace" /> : null}
          {workspaceError ? <NotificationToast message={workspaceError} tone="danger" /> : null}
          <div className="mt-5">
            <ProjectWorkspacePanel workspace={projectWorkspace} />
          </div>
        </section>
        <section
          aria-labelledby="project-deployment-tab"
          className="mt-6"
          hidden={activeMissionControlTab !== "deployment"}
          id="project-deployment-panel"
          role="tabpanel"
        >
          <SectionHeader
            description="Additive production runtime assets generated from the current project package."
            title="Deployment"
          />
          <div className="mt-5">
            <ProjectDeploymentPanel
              canGenerate={Boolean(projectPackage && packageManifest)}
              error={deploymentError}
              isGenerating={isGeneratingDeployment}
              onGenerate={runDeploymentGeneration}
              plan={deploymentPlan}
            />
          </div>
        </section>
        <section
          aria-labelledby="project-review-tab"
          className="mt-6"
          hidden={activeMissionControlTab !== "review"}
          id="project-review-panel"
          role="tabpanel"
        >
          <SectionHeader
            description="An independent review of the generated project, with selective artifact refinement."
            title="Project Review"
          />
          <div className="mt-5">
            <ProjectReviewPanel
              canRefine={isProjectReviewCurrent}
              canReview={Boolean(projectWorkspace)}
              error={projectReviewError}
              isRefining={isRefiningProject}
              isReviewing={isReviewingProject}
              onRefine={refineProjectArtifacts}
              onReview={runProjectReview}
              refinementRequests={refinementRequests}
              review={projectReview}
            />
          </div>
        </section>
        <section
          aria-labelledby="project-verification-tab"
          className="mt-6"
          hidden={activeMissionControlTab !== "sandbox"}
          id="project-verification-panel"
          role="tabpanel"
        >
          <SectionHeader
            description="A safe structural inspection of the packaged project. Generated code is never executed."
            title="Sandbox Verification"
          />
          <div className="mt-5">
            <ProjectVerificationPanel
              canVerify={Boolean(projectWorkspace && projectPackage)}
              error={verificationError}
              isVerifying={isVerifyingProject}
              onVerify={runProjectVerification}
              report={verificationReport}
            />
          </div>
        </section>
        <section
          aria-labelledby="project-validation-tab"
          className="mt-6"
          hidden={activeMissionControlTab !== "validation"}
          id="project-validation-panel"
          role="tabpanel"
        >
          <SectionHeader
            description="A read-only quality inspection of the current workspace and export package."
            title="Validation Report"
          />
          <div className="mt-5">
            <ProjectValidationPanel
              canValidate={Boolean(projectWorkspace && projectPackage)}
              error={validationError}
              isValidating={isValidatingProject}
              onValidate={runProjectValidation}
              report={validationReport}
            />
          </div>
        </section>
        <section
          aria-labelledby="project-export-tab"
          className="mt-6"
          hidden={activeMissionControlTab !== "export"}
          id="project-export-panel"
          role="tabpanel"
        >
          <SectionHeader
            description="A portable ZIP package assembled from the completed project workspace."
            title="Project Export"
          />
          {packageError ? <NotificationToast message={packageError} tone="danger" /> : null}
          <div className="mt-5">
            <ProjectExportPanel
              exportBundle={exportBundle}
              isPackaging={isPackagingProject}
              isValidating={isValidatingProject}
              isVerifying={isVerifyingProject}
              includedFiles={packageIncludedFiles}
              manifest={packageManifest}
              onRequestVerifiedPackage={requestVerifiedPackage}
              projectPackage={projectPackage}
              validationReport={validationReport}
              verificationReport={verificationReport}
            />
          </div>
        </section>
        <div
          aria-labelledby="mission-overview-tab"
          hidden={activeMissionControlTab !== "mission"}
          id="mission-overview-panel"
          role="tabpanel"
        >
          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            <Panel className="p-5 xl:col-span-2">
              <SectionHeader
                description="The operating posture established by the Organization Architect."
                title="Organization DNA"
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(blueprint.dna).map(([attribute, value]) => (
                  <Chip key={attribute}>
                    {attribute} · {value}
                  </Chip>
                ))}
              </div>
            </Panel>
            <Panel className="p-5">
              <SectionHeader
                description="The initial organizational structure."
                title="Departments"
              />
              <div className="mt-5 space-y-3">
                {blueprint.departments.map((department) => (
                  <div
                    className="border-border border-t pt-3 first:border-t-0 first:pt-0"
                    key={department.name}
                  >
                    <p className="text-body font-medium">{department.name}</p>
                    <p className="text-caption text-secondary mt-1">{department.mandate}</p>
                    <p className="text-label text-muted mt-2">{department.roles.length} roles</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <Panel className="p-5">
              <SectionHeader
                description="A department roadmap prepared from the approved organization blueprint."
                title="Execution Timeline"
              />
              {executionPlan ? (
                <ol className="mt-6">
                  {executionPlan.phases.map((phase) => (
                    <motionElement.li
                      animate="visible"
                      initial="hidden"
                      key={phase.phase_number}
                      variants={slideUp}
                    >
                      <TimelineCard
                        timestamp={`Phase ${phase.phase_number}`}
                        title={phase.phase_name}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Chip>{phase.department}</Chip>
                            <Badge className="capitalize" tone="info">
                              {phase.status}
                            </Badge>
                            <span className="text-caption text-muted">
                              {phase.estimated_duration}
                            </span>
                          </div>
                          <p>{phase.objective}</p>
                          <p className="text-caption text-muted">
                            {phase.dependencies.length > 0
                              ? `Depends on: ${phase.dependencies.join(", ")}`
                              : "No dependencies"}
                          </p>
                          {taskGroups ? (
                            (() => {
                              const taskGroup = taskGroups.find(
                                (group) => group.phase_id === phase.phase_number,
                              );
                              if (!taskGroup) return null;

                              return (
                                <details className="border-border bg-surface rounded-lg border p-3">
                                  <summary className="text-body cursor-pointer font-medium">
                                    View {taskGroup.tasks.length} generated tasks
                                  </summary>
                                  <ul className="mt-4 space-y-3">
                                    {taskGroup.tasks.map((task) => (
                                      <li key={task.task_id}>
                                        <Card className="bg-panel p-4">
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                              <p className="text-body font-medium">
                                                {task.task_name}
                                              </p>
                                              <p className="text-caption text-secondary mt-1">
                                                {task.description}
                                              </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              <Badge className="capitalize" tone="accent">
                                                {task.priority}
                                              </Badge>
                                            </div>
                                          </div>
                                          <p className="text-caption text-muted mt-3">
                                            {task.estimated_duration}
                                            {task.dependencies.length > 0
                                              ? ` · Depends on: ${task.dependencies.join(", ")}`
                                              : ""}
                                          </p>
                                          <TaskWorkflowStatus
                                            isInitializing={isInitializingWorkflow}
                                            taskId={task.task_id}
                                            workflow={workflow}
                                          />
                                          {latestExecutionForTask(
                                            executionHistory,
                                            task.task_id,
                                          ) ? (
                                            <TaskExecutionDetail
                                              execution={latestExecutionForTask(
                                                executionHistory,
                                                task.task_id,
                                              )!}
                                            />
                                          ) : null}
                                          <TaskArtifactAttachment
                                            artifactCollection={artifactCollection}
                                            taskId={task.task_id}
                                          />
                                          {workerAssignmentResult ? (
                                            <AssignedWorker
                                              assignmentResult={workerAssignmentResult}
                                              taskId={task.task_id}
                                            />
                                          ) : isAssigningWorkers ? (
                                            <div className="mt-3">
                                              <LoadingIndicator label="Assigning worker" />
                                            </div>
                                          ) : null}
                                        </Card>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              );
                            })()
                          ) : isGeneratingTasks ? (
                            <LoadingIndicator label="Generating phase tasks" />
                          ) : null}
                        </div>
                      </TimelineCard>
                    </motionElement.li>
                  ))}
                </ol>
              ) : (
                <div className="border-border bg-surface mt-6 flex min-h-32 items-center justify-center rounded-lg border border-dashed">
                  {isInitializing ? (
                    <LoadingIndicator label="Preparing execution timeline" />
                  ) : (
                    <span className="text-body text-secondary">Preparing Organization...</span>
                  )}
                </div>
              )}
            </Panel>
            <Panel className="p-5">
              <SectionHeader
                description="Worker assignments will appear after execution initialization."
                title="Workers"
              />
              {workerAssignmentResult ? (
                <div className="mt-6 space-y-3">
                  {workerAssignmentResult.workers.map((worker) => (
                    <motionElement.div
                      animate="visible"
                      initial="hidden"
                      key={worker.worker_id}
                      variants={slideUp}
                    >
                      <Card className="bg-surface p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-body font-medium">{worker.worker_name}</p>
                            <p className="text-caption text-secondary mt-1">
                              {worker.role} · {worker.department}
                            </p>
                          </div>
                          <Badge
                            className="capitalize"
                            tone={
                              executionStatusTone[
                                executionHistory
                                  ?.flatMap((result) => result.executions)
                                  .filter((execution) => execution.worker_id === worker.worker_id)
                                  .at(-1)?.status ?? "waiting"
                              ]
                            }
                          >
                            {executionHistory
                              ?.flatMap((result) => result.executions)
                              .filter((execution) => execution.worker_id === worker.worker_id)
                              .at(-1)?.status ?? worker.current_status}
                          </Badge>
                        </div>
                        <p className="text-caption text-muted mt-3">
                          {worker.assigned_tasks.length} assigned tasks
                        </p>
                      </Card>
                    </motionElement.div>
                  ))}
                </div>
              ) : (
                <div className="border-border bg-surface mt-6 flex min-h-32 items-center justify-center rounded-lg border border-dashed">
                  <span className="text-body text-secondary">
                    {isAssigningWorkers ? "Assigning workers..." : "No workers assigned yet."}
                  </span>
                </div>
              )}
            </Panel>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel className="p-5">
              <SectionHeader
                description="Mission deliverables will appear as they are generated."
                title="Mission Artifacts"
              />
              <MissionArtifacts
                artifactCollection={artifactCollection}
                isGenerating={isExecutingReadyTasks}
                workerAssignmentResult={workerAssignmentResult}
              />
            </Panel>
            <Panel className="p-5">
              <SectionHeader
                description="The initial record of organization formation."
                title="Activity Feed"
              />
              <div className="mt-6">
                <TimelineCard timestamp={creationTime} title="Organization Created">
                  The Organization Architect produced a validated blueprint.
                </TimelineCard>
                <TimelineCard timestamp={creationTime} title="Mission Accepted" tone="success">
                  Genesis accepted the mission for organization formation.
                </TimelineCard>
                <TimelineCard timestamp="Now" title="Mission Control Initialized" tone="success">
                  The organization headquarters is ready for execution planning.
                </TimelineCard>
              </div>
            </Panel>
          </div>
          <Panel className="mt-4 p-5">
            <SectionHeader
              description="Worker communication is preserved by phase so teams can build on shared knowledge."
              title="Team Collaboration"
            />
            <TeamCollaboration
              collaborationSession={collaborationSession}
              workerAssignmentResult={workerAssignmentResult}
            />
          </Panel>
          <Panel className="mt-4 p-5">
            <SectionHeader
              description="Completed task outputs preserved as shared knowledge for future workers."
              title="Organization Memory"
            />
            {organizationMemory?.entries.length ? (
              <ol className="mt-6 space-y-3">
                {[...organizationMemory.entries]
                  .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
                  .map((entry) => (
                    <li
                      className="border-border bg-surface rounded-lg border p-4"
                      key={entry.memory_id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-body font-medium">{entry.title}</p>
                          <p className="text-caption text-secondary mt-1">{entry.summary}</p>
                        </div>
                        <time className="text-caption text-muted">
                          {formatMissionControlTime(entry.timestamp)}
                        </time>
                      </div>
                      <p className="text-caption text-muted mt-3">
                        Worker: {entry.worker_id} · Department: {entry.department} · Task:{" "}
                        {entry.task_id}
                      </p>
                    </li>
                  ))}
              </ol>
            ) : (
              <div className="border-border bg-surface mt-6 flex min-h-28 items-center justify-center rounded-lg border border-dashed">
                <span className="text-body text-secondary">No organization memory stored yet.</span>
              </div>
            )}
          </Panel>
        </div>
        <div className="border-border mt-8 border-t pt-6">
          <Button
            disabled={Boolean(executionPlan) || isInitializing}
            onClick={initializeExecution}
            size="lg"
          >
            {executionPlan
              ? "Execution Timeline Ready"
              : isInitializing
                ? "Preparing Execution Plan"
                : "Initialize Execution"}
            <icons.continue aria-hidden="true" size={16} />
          </Button>
          <Button
            disabled={readyTaskCount === 0 || isExecutingReadyTasks}
            onClick={runReadyTasks}
            size="lg"
            variant="secondary"
          >
            {isExecutingReadyTasks
              ? "Executing Ready Tasks"
              : `Execute ${readyTaskCount} Ready Tasks`}
            <icons.continue aria-hidden="true" size={16} />
          </Button>
          {isCollaborativeExecutionDeferred ? (
            <Button
              disabled={readyTaskCount === 0 || isExecutingReadyTasks}
              onClick={runReadyTasks}
              size="lg"
              variant="secondary"
            >
              Retry Now
              <icons.continue aria-hidden="true" size={16} />
            </Button>
          ) : null}
          {plannerError ? <NotificationToast message={plannerError} tone="danger" /> : null}
          {taskGeneratorError ? (
            <NotificationToast message={taskGeneratorError} tone="danger" />
          ) : null}
          {workerAssignmentError ? (
            <NotificationToast message={workerAssignmentError} tone="danger" />
          ) : null}
          {workflowError ? <NotificationToast message={workflowError} tone="danger" /> : null}
        </div>
      </PageContainer>
    </main>
  );
}
