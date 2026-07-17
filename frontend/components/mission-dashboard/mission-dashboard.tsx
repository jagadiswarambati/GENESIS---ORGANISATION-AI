"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/design-system/badge";
import { Card, Panel } from "@/components/design-system/card";
import { EmptyState, LoadingIndicator } from "@/components/design-system/feedback";
import { PageContainer, SectionHeader, TopNavigation } from "@/components/design-system/layout";
import { MetricCard, TimelineCard } from "@/components/design-system/organization";
import { ProgressBar } from "@/components/design-system/progress";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { icons } from "@/lib/icons";
import {
  aggregateMissionDashboard,
  type DashboardMissionStatus,
  type DashboardPhase,
  type DashboardWorkerStatus,
} from "@/lib/mission-dashboard";
import {
  formatMissionControlTime,
  readMissionControlSession,
  subscribeMissionControlSession,
  type MissionControlSession,
} from "@/lib/mission-control-session";

type SessionState = MissionControlSession | null | undefined;

const missionStatusTone: Record<DashboardMissionStatus, "info" | "success" | "warning" | "danger"> =
  {
    active: "info",
    blocked: "warning",
    completed: "success",
    failed: "danger",
    preparing: "info",
  };

const phaseStatusTone: Record<DashboardPhase["status"], "info" | "success" | "warning" | "danger"> =
  {
    active: "info",
    blocked: "warning",
    completed: "success",
    failed: "danger",
    pending: "info",
  };

const workerStatusTone: Record<DashboardWorkerStatus, "info" | "success" | "danger"> = {
  completed: "success",
  failed: "danger",
  running: "info",
  waiting: "info",
};

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function formatProjectSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MissionDashboard(): React.JSX.Element {
  const [session, setSession] = useState<SessionState>(undefined);
  const BrandIcon = icons.organization;

  useEffect(() => {
    const updateSession = (): void => setSession(readMissionControlSession());
    updateSession();
    return subscribeMissionControlSession(updateSession);
  }, []);

  if (session === undefined) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <LoadingIndicator label="Opening Live Mission Dashboard" />
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center px-5">
        <div className="max-w-reading w-full">
          <EmptyState
            description="Launch an organization from Genesis before opening the mission dashboard."
            title="Mission Dashboard is awaiting an organization"
          />
        </div>
      </main>
    );
  }

  const dashboard = aggregateMissionDashboard(session);

  return (
    <main className="bg-background min-h-screen">
      <TopNavigation>
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <BrandIcon aria-hidden="true" size={15} />
          </span>
          <span className="text-title">Genesis</span>
          <span className="text-caption text-muted">Live Mission Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="text-caption text-secondary hover:text-foreground"
            href="/mission-control"
          >
            Mission Control
          </Link>
          <ThemeToggle />
        </div>
      </TopNavigation>
      <PageContainer>
        <section aria-labelledby="dashboard-title">
          <p className="text-label text-muted">Live overview</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-heading" id="dashboard-title">
                {session.blueprint.organization_name}
              </h1>
              <p className="max-w-reading text-body text-secondary mt-2">
                {session.blueprint.mission_summary}
              </p>
            </div>
            <Badge className="capitalize" tone={missionStatusTone[dashboard.missionStatus]}>
              {dashboard.missionStatus}
            </Badge>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Mission name" value={session.blueprint.mission_summary} />
            <MetricCard label="Organization name" value={session.blueprint.organization_name} />
            <MetricCard label="Overall mission status" value={dashboard.missionStatus} />
            <MetricCard label="Mission progress" value={`${dashboard.missionProgress}%`} />
            <MetricCard
              label="Total execution time"
              value={formatDuration(dashboard.totalExecutionTimeMs)}
            />
            <MetricCard label="Estimated remaining time" value={dashboard.estimatedRemainingTime} />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="execution-statistics-title">
          <SectionHeader title="Execution Statistics" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total phases" value={String(dashboard.execution.total)} />
            <MetricCard label="Completed phases" value={String(dashboard.execution.completed)} />
            <MetricCard label="Active phase" value={dashboard.execution.activePhase} />
            <MetricCard label="Remaining phases" value={String(dashboard.execution.remaining)} />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="task-statistics-title">
          <SectionHeader title="Task Statistics" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Total tasks"
              value={String(
                Object.values(dashboard.taskCounts).reduce((total, count) => total + count, 0),
              )}
            />
            <MetricCard label="Ready tasks" value={String(dashboard.taskCounts.ready)} />
            <MetricCard label="Running tasks" value={String(dashboard.taskCounts.running)} />
            <MetricCard label="Completed tasks" value={String(dashboard.taskCounts.completed)} />
            <MetricCard label="Blocked tasks" value={String(dashboard.taskCounts.blocked)} />
            <MetricCard label="Failed tasks" value={String(dashboard.taskCounts.failed)} />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="mission-timeline-title">
          <SectionHeader
            description="A live view of department progress through the approved execution sequence."
            title="Mission Timeline"
          />
          <div className="mt-5 space-y-3">
            {dashboard.phases.map((phase) => (
              <Card className="p-5" key={phase.name}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-title">{phase.name}</p>
                    <p className="text-caption text-secondary mt-1">
                      {phase.completedTasks} of {phase.totalTasks} tasks completed
                    </p>
                  </div>
                  <Badge className="capitalize" tone={phaseStatusTone[phase.status]}>
                    {phase.status}
                  </Badge>
                </div>
                <ProgressBar
                  className="mt-5"
                  label="Phase completion"
                  value={phase.completionPercentage}
                />
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="worker-statistics-title">
          <SectionHeader title="Worker Statistics" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total workers" value={String(dashboard.workers.length)} />
            <MetricCard label="Waiting workers" value={String(dashboard.workerCounts.waiting)} />
            <MetricCard label="Running workers" value={String(dashboard.workerCounts.running)} />
            <MetricCard
              label="Completed workers"
              value={String(dashboard.workerCounts.completed)}
            />
            <MetricCard label="Failed workers" value={String(dashboard.workerCounts.failed)} />
          </div>
          <Panel className="mt-5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="border-border bg-surface border-b">
                  <tr className="text-label text-muted">
                    <th className="px-4 py-3 font-medium">Worker</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Assigned</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.workers.map((worker) => (
                    <tr className="border-border border-b last:border-0" key={worker.workerId}>
                      <td className="text-body px-4 py-3 font-medium">{worker.name}</td>
                      <td className="text-caption text-secondary px-4 py-3">{worker.department}</td>
                      <td className="px-4 py-3">
                        <Badge className="capitalize" tone={workerStatusTone[worker.status]}>
                          {worker.status}
                        </Badge>
                      </td>
                      <td className="text-body text-secondary px-4 py-3">
                        {worker.assignedTaskCount}
                      </td>
                      <td className="text-body text-secondary px-4 py-3">
                        {worker.completedTaskCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>

        <section className="mt-10" aria-labelledby="artifact-statistics-title">
          <SectionHeader
            description="Project files materialized from completed worker executions."
            title="Mission Artifacts"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total artifacts" value={String(dashboard.artifacts.total)} />
            {dashboard.artifacts.byDepartment.map((item) => (
              <MetricCard
                key={item.department}
                label={`${item.department} artifacts`}
                value={String(item.count)}
              />
            ))}
          </div>
          <Panel className="mt-5 p-5">
            <SectionHeader title="Recently Generated Artifacts" />
            {dashboard.artifacts.recent.length ? (
              <ol className="mt-5 space-y-3">
                {dashboard.artifacts.recent.map((artifact) => (
                  <li
                    className="border-border border-t pt-3 first:border-t-0 first:pt-0"
                    key={artifact.artifact_id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-body font-medium">{artifact.artifact_name}</p>
                        <p className="text-caption text-secondary mt-1">
                          {artifact.department} · {artifact.artifact_type}
                        </p>
                      </div>
                      <Badge className="capitalize" tone="success">
                        {artifact.status}
                      </Badge>
                    </div>
                    <time className="text-caption text-muted mt-2 block">
                      {formatMissionControlTime(artifact.generated_at)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body text-secondary mt-5">No artifacts generated yet.</p>
            )}
          </Panel>
        </section>

        <section className="mt-10" aria-labelledby="workspace-statistics-title">
          <SectionHeader
            description="Repository health derived from the workspace assembled from completed artifacts."
            title="Project Workspace"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Workspace status" value={dashboard.workspace.buildStatus} />
            <MetricCard label="Generated repository" value={dashboard.workspace.projectName} />
            <MetricCard
              label="Total source files"
              value={String(dashboard.workspace.totalSourceFiles)}
            />
            <MetricCard
              label="Project size"
              value={formatProjectSize(dashboard.workspace.projectSize)}
            />
          </div>
          <Panel className="mt-5 p-5">
            <SectionHeader title="Repository Statistics" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Total files" value={String(dashboard.workspace.totalFiles)} />
              <MetricCard label="Total folders" value={String(dashboard.workspace.totalFolders)} />
            </div>
            {dashboard.workspace.largestDepartments.length ? (
              <div className="mt-5">
                <p className="text-label text-muted">Largest departments</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {dashboard.workspace.largestDepartments.map((department) => (
                    <MetricCard
                      key={department.department}
                      label={`${department.department} files`}
                      value={String(department.count)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        </section>

        <section className="mt-10" aria-labelledby="export-statistics-title">
          <SectionHeader
            description="Portable package metadata derived from the completed project workspace."
            title="Project Export"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Export status" value={dashboard.packaging.exportStatus} />
            <MetricCard label="Latest package" value={dashboard.packaging.latestPackage} />
            <MetricCard
              label="Package size"
              value={formatProjectSize(dashboard.packaging.packageSize)}
            />
            <MetricCard
              label="Download count"
              value={`${dashboard.packaging.downloadCount} (future)`}
            />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="validation-statistics-title">
          <SectionHeader
            description="Read-only quality checks for the current workspace and export package."
            title="Project Validation"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Project health"
              value={
                dashboard.validation.status === "pending"
                  ? "Awaiting validation"
                  : `${dashboard.validation.healthScore}%`
              }
            />
            <MetricCard label="Validation status" value={dashboard.validation.status} />
            <MetricCard label="Total issues" value={String(dashboard.validation.totalIssues)} />
            <MetricCard
              label="Critical issues"
              value={String(dashboard.validation.criticalIssues)}
            />
            <MetricCard label="Warnings" value={String(dashboard.validation.warnings)} />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="verification-statistics-title">
          <SectionHeader
            description="Safe, deterministic structural verification for the current package revision."
            title="Sandbox Verification"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Latest verification"
              value={
                dashboard.verification.status === "pending"
                  ? "Awaiting verification"
                  : dashboard.verification.status
              }
            />
            <MetricCard
              label="Build success rate"
              value={
                dashboard.verification.status === "pending"
                  ? "Awaiting verification"
                  : `${dashboard.verification.buildSuccessRate}%`
              }
            />
            <MetricCard
              label="Last verification time"
              value={
                dashboard.verification.lastVerificationTime
                  ? formatMissionControlTime(dashboard.verification.lastVerificationTime)
                  : "Awaiting verification"
              }
            />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="review-statistics-title">
          <SectionHeader
            description="Independent project analysis and selective artifact improvements."
            title="Project Review"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Review score"
              value={
                dashboard.review.score === null ? "Awaiting review" : `${dashboard.review.score}%`
              }
            />
            <MetricCard
              label="Total suggestions"
              value={String(dashboard.review.totalSuggestions)}
            />
            <MetricCard
              label="Resolved suggestions"
              value={String(dashboard.review.resolvedSuggestions)}
            />
            <MetricCard
              label="Pending suggestions"
              value={String(dashboard.review.pendingSuggestions)}
            />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="deployment-statistics-title">
          <SectionHeader
            description="Runtime readiness derived from the additive deployment overlay for the current package."
            title="Deployment"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Deployment ready"
              value={
                dashboard.deployment.status === "pending"
                  ? "Awaiting deployment assets"
                  : dashboard.deployment.isReady
                    ? "Ready"
                    : "Needs configuration"
              }
            />
            <MetricCard
              label="Runtime status"
              value={dashboard.deployment.runtimeStatus.replaceAll("_", " ")}
            />
            <MetricCard
              label="Missing configuration"
              value={
                dashboard.deployment.missingConfiguration.length
                  ? `${dashboard.deployment.missingConfiguration.length} item(s)`
                  : "None"
              }
            />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="collaboration-statistics-title">
          <SectionHeader
            description="Communication preserved across the organization before, during, and after execution."
            title="Team Collaboration"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total conversations"
              value={String(dashboard.collaboration.totalConversations)}
            />
            <MetricCard
              label="Active collaboration sessions"
              value={String(dashboard.collaboration.activeSessions)}
            />
            <MetricCard
              label="Most active worker"
              value={dashboard.collaboration.mostActiveWorker}
            />
            {dashboard.collaboration.messagesByDepartment.map((item) => (
              <MetricCard
                key={item.department}
                label={`${item.department} messages`}
                value={String(item.count)}
              />
            ))}
          </div>
          <Panel className="mt-5 p-5">
            <SectionHeader title="Latest Collaboration Activity" />
            {dashboard.collaboration.recent.length ? (
              <ol className="mt-5 space-y-3">
                {dashboard.collaboration.recent.map((message) => (
                  <li
                    className="border-border border-t pt-3 first:border-t-0 first:pt-0"
                    key={message.message_id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-body font-medium">{message.sender_worker_id}</p>
                        <p className="text-caption text-secondary mt-1">
                          {message.sender_department} / {message.message_type.replace("_", " ")}
                        </p>
                      </div>
                      <time className="text-caption text-muted">
                        {formatMissionControlTime(message.timestamp)}
                      </time>
                    </div>
                    <p className="text-caption text-secondary mt-2">{message.content}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body text-secondary mt-5">No collaboration activity yet.</p>
            )}
          </Panel>
        </section>

        <div className="mt-10 grid gap-4 xl:grid-cols-2">
          <Panel className="p-5">
            <SectionHeader title="Organization Memory" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Total memory entries" value={String(dashboard.memory.total)} />
              <MetricCard label="Latest memory entry" value={dashboard.latestMemoryEntry} />
            </div>
          </Panel>
          <Panel className="p-5">
            <SectionHeader title="Recent Activity Timeline" />
            <div className="mt-6">
              {dashboard.activity.slice(0, 8).map((activity, index) => (
                <TimelineCard
                  key={`${activity.title}-${activity.timestamp}-${index}`}
                  timestamp={formatMissionControlTime(activity.timestamp)}
                  title={activity.title}
                  tone={activity.title.includes("Completed") ? "success" : "info"}
                >
                  {activity.detail}
                </TimelineCard>
              ))}
            </div>
          </Panel>
        </div>
      </PageContainer>
    </main>
  );
}
