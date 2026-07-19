"use client";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { LoadingIndicator, NotificationToast } from "@/components/design-system/feedback";
import type {
  ProjectImplementationLevel,
  VerificationReport,
  VerificationStatus,
} from "@/lib/api/verification";
import { formatMissionControlTime } from "@/lib/mission-control-session";

const statusTone: Record<VerificationStatus, "success" | "danger" | "warning"> = {
  failed: "danger",
  passed: "success",
  pending: "warning",
};

const implementationLabel: Record<ProjectImplementationLevel, string> = {
  complete: "Complete Implementation",
  foundation: "Project Foundation",
  partial: "Partial Implementation",
};

function verificationStatusLabel(
  implementationLevel: ProjectImplementationLevel,
  status: VerificationStatus,
): string {
  if (status === "failed") return "Verification Failed";
  if (implementationLevel === "foundation") return "Foundation Verified";
  if (implementationLevel === "partial") return "Partial Implementation Verified";
  return "Complete Implementation Verified";
}

function targetStatusLabel(status: VerificationStatus): string {
  if (status === "pending") return "Awaiting Code Generation";
  return status === "passed" ? "Verified" : "Verification Failed";
}

export function ProjectVerificationPanel({
  canVerify,
  error,
  isVerifying,
  onVerify,
  report,
}: Readonly<{
  canVerify: boolean;
  error?: string | null;
  isVerifying: boolean;
  onVerify: () => Promise<VerificationReport | null>;
  report?: VerificationReport;
}>): React.JSX.Element {
  if (!report) {
    return (
      <div className="border-border bg-surface flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <div>
          {isVerifying ? (
            <LoadingIndicator label="Verifying project sandbox" />
          ) : (
            <>
              <p className="text-body text-secondary">
                Sandbox verification is awaiting a packaged workspace.
              </p>
              {canVerify ? (
                <Button
                  className="mt-4"
                  onClick={() => void onVerify()}
                  size="sm"
                  variant="secondary"
                >
                  Run Verification
                </Button>
              ) : null}
            </>
          )}
          {error ? <NotificationToast message={error} tone="danger" /> : null}
        </div>
      </div>
    );
  }

  const { sandbox_run: sandboxRun } = report;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <p className="text-label text-muted">Verification status</p>
          <Badge className="mt-2" tone={statusTone[sandboxRun.status]}>
            {verificationStatusLabel(sandboxRun.implementation_level, sandboxRun.status)}
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Project scope</p>
          <p className="text-body mt-2 font-medium">
            {implementationLabel[sandboxRun.implementation_level]}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Structural checks</p>
          <Badge className="mt-2" tone={statusTone[sandboxRun.build_status]}>
            {sandboxRun.build_status === "passed" ? "Verified" : sandboxRun.build_status}
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Code generation</p>
          <Badge className="mt-2" tone={statusTone[sandboxRun.test_status]}>
            {sandboxRun.test_status === "pending"
              ? "Awaiting Code Generation"
              : sandboxRun.test_status === "passed"
                ? "Verified"
                : "Verification Failed"}
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Exit code</p>
          <p className="text-title mt-2">{sandboxRun.exit_code}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-title">Verification Summary</p>
            <p className="text-caption text-secondary mt-1">{sandboxRun.verification_summary}</p>
            <p className="text-caption text-muted mt-2">
              Finished {formatMissionControlTime(sandboxRun.finished_at)}
            </p>
          </div>
          <Button
            disabled={isVerifying}
            onClick={() => void onVerify()}
            size="sm"
            variant="secondary"
          >
            {isVerifying ? "Verifying" : "Reverify Project"}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {report.build_results.map((result) => (
          <Card className="p-5" key={result.target}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-title">{result.target}</p>
                <p className="text-caption text-secondary mt-1">
                  {result.passed_checks} passed · {result.pending_checks} awaiting ·{" "}
                  {result.failed_checks} failed
                </p>
              </div>
              <Badge tone={statusTone[result.status]}>{targetStatusLabel(result.status)}</Badge>
            </div>
            <pre className="border-border bg-panel text-caption mt-4 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border p-3">
              {result.build_logs.join("\n")}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
