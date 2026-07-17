"use client";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { LoadingIndicator, NotificationToast } from "@/components/design-system/feedback";
import type {
  ProjectHealthStatus,
  ValidationReport,
  ValidationSeverity,
} from "@/lib/api/validation";
import { formatMissionControlTime } from "@/lib/mission-control-session";

const severityTone: Record<ValidationSeverity, "warning" | "danger"> = {
  critical: "danger",
  error: "danger",
  warning: "warning",
};

const healthTone: Record<ProjectHealthStatus, "success" | "info" | "warning"> = {
  excellent: "success",
  good: "info",
  needs_review: "warning",
};

export function ProjectValidationPanel({
  canValidate,
  error,
  isValidating,
  onValidate,
  report,
}: Readonly<{
  canValidate: boolean;
  error?: string | null;
  isValidating: boolean;
  onValidate: () => Promise<ValidationReport | null>;
  report?: ValidationReport;
}>): React.JSX.Element {
  if (!report) {
    return (
      <div className="border-border bg-surface flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <div>
          {isValidating ? (
            <LoadingIndicator label="Validating project workspace" />
          ) : (
            <>
              <p className="text-body text-secondary">
                Validation is awaiting a packaged workspace.
              </p>
              {canValidate ? (
                <Button
                  className="mt-4"
                  onClick={() => void onValidate()}
                  size="sm"
                  variant="secondary"
                >
                  Run Validation
                </Button>
              ) : null}
            </>
          )}
          {error ? <NotificationToast message={error} tone="danger" /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-label text-muted">Health score</p>
          <p className="text-title mt-2">{report.health.score}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Project health</p>
          <Badge className="mt-2 capitalize" tone={healthTone[report.health.status]}>
            {report.health.status.replace("_", " ")}
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Passed checks</p>
          <p className="text-title mt-2">
            {report.health.passed_checks}/{report.health.total_checks}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Total issues</p>
          <p className="text-title mt-2">{report.issues.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-title">Validation Summary</p>
            <p className="text-caption text-secondary mt-1">
              Validated {formatMissionControlTime(report.created_at)}
            </p>
          </div>
          <Button
            disabled={isValidating}
            onClick={() => void onValidate()}
            size="sm"
            variant="secondary"
          >
            {isValidating ? "Validating" : "Revalidate Project"}
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="border-border bg-panel rounded-lg border p-3">
            <p className="text-label text-muted">Warnings</p>
            <p className="text-title mt-1">{report.health.warnings}</p>
          </div>
          <div className="border-border bg-panel rounded-lg border p-3">
            <p className="text-label text-muted">Errors</p>
            <p className="text-title mt-1">{report.health.errors}</p>
          </div>
          <div className="border-border bg-panel rounded-lg border p-3">
            <p className="text-label text-muted">Critical issues</p>
            <p className="text-title mt-1">{report.health.critical_issues}</p>
          </div>
        </div>
      </Card>

      {report.issues.length ? (
        <ol className="space-y-3">
          {report.issues.map((issue) => (
            <li className="border-border bg-surface rounded-lg border p-4" key={issue.issue_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize" tone={severityTone[issue.severity]}>
                      {issue.severity}
                    </Badge>
                    <span className="text-label text-muted">
                      {issue.category.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-body mt-3 font-medium">{issue.description}</p>
                </div>
                <time className="text-caption text-muted">
                  {formatMissionControlTime(issue.timestamp)}
                </time>
              </div>
              {issue.file ? (
                <p className="text-caption text-secondary mt-3">File: {issue.file}</p>
              ) : null}
              <p className="text-caption text-muted mt-2">Suggested fix: {issue.suggested_fix}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-border bg-surface flex min-h-28 items-center justify-center rounded-lg border border-dashed">
          <p className="text-body text-secondary">No validation issues found.</p>
        </div>
      )}
    </div>
  );
}
