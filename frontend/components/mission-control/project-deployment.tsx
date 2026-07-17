"use client";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { LoadingIndicator, NotificationToast } from "@/components/design-system/feedback";
import type {
  DeploymentAssetStatus,
  DeploymentPlan,
  HealthCheckStatus,
  RuntimeStatus,
} from "@/lib/api/deployment";
import { formatMissionControlTime } from "@/lib/mission-control-session";

const assetTone: Record<DeploymentAssetStatus, "success" | "info"> = {
  generated: "success",
  provided: "info",
};

const runtimeTone: Record<RuntimeStatus, "success" | "warning" | "danger"> = {
  configuration_required: "warning",
  not_ready: "danger",
  ready: "success",
};

const healthTone: Record<HealthCheckStatus, "success" | "warning"> = {
  generated: "success",
  unavailable: "warning",
};

export function ProjectDeploymentPanel({
  canGenerate,
  error,
  isGenerating,
  onGenerate,
  plan,
}: Readonly<{
  canGenerate: boolean;
  error?: string | null;
  isGenerating: boolean;
  onGenerate: () => Promise<DeploymentPlan | null>;
  plan?: DeploymentPlan;
}>): React.JSX.Element {
  if (!plan) {
    return (
      <div className="border-border bg-surface flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <div>
          {isGenerating ? (
            <LoadingIndicator label="Generating deployment overlay" />
          ) : (
            <>
              <p className="text-body text-secondary">
                Deployment assets are awaiting a packaged project.
              </p>
              {canGenerate ? (
                <Button
                  className="mt-4"
                  onClick={() => void onGenerate()}
                  size="sm"
                  variant="secondary"
                >
                  Generate Deployment Assets
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
          <p className="text-label text-muted">Deployment status</p>
          <Badge className="mt-2 capitalize" tone={plan.status === "ready" ? "success" : "warning"}>
            {plan.status.replaceAll("_", " ")}
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Runtime status</p>
          <Badge className="mt-2 capitalize" tone={runtimeTone[plan.runtime_status]}>
            {plan.runtime_status.replaceAll("_", " ")}
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Deployment files</p>
          <p className="text-title mt-2">{plan.deployment_assets.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Health checks</p>
          <p className="text-title mt-2">{plan.health_checks.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-title">Runtime Configuration</p>
            <p className="text-caption text-secondary mt-1">{plan.runtime_configuration_summary}</p>
            <p className="text-caption text-muted mt-2">
              Generated {formatMissionControlTime(plan.created_at)}
            </p>
          </div>
          <Button
            disabled={isGenerating}
            onClick={() => void onGenerate()}
            size="sm"
            variant="secondary"
          >
            {isGenerating ? "Generating" : "Regenerate Deployment Assets"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <p className="text-title">Runtime Requirements</p>
          <dl className="mt-4 space-y-3">
            {plan.runtime_requirements.map((requirement) => (
              <div
                className="border-border border-t pt-3 first:border-t-0 first:pt-0"
                key={requirement.name}
              >
                <dt className="text-body font-medium">
                  {requirement.name} <span className="text-secondary">{requirement.version}</span>
                </dt>
                <dd className="text-caption text-secondary mt-1">{requirement.purpose}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-5">
          <p className="text-title">Required Environment Variables</p>
          <dl className="mt-4 space-y-3">
            {plan.required_environment_variables.map((variable) => (
              <div
                className="border-border border-t pt-3 first:border-t-0 first:pt-0"
                key={variable.name}
              >
                <dt className="text-body font-medium">{variable.name}</dt>
                <dd className="text-caption text-secondary mt-1">{variable.description}</dd>
                <dd className="text-caption text-muted mt-1">Example: {variable.example}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-title">Generated Deployment Files</p>
        <ol className="mt-4 space-y-3">
          {plan.deployment_assets.map((asset) => (
            <li
              className="border-border border-t pt-3 first:border-t-0 first:pt-0"
              key={asset.file_path}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-body font-medium">{asset.file_path}</p>
                  <p className="text-caption text-secondary mt-1">{asset.description}</p>
                </div>
                <Badge tone={assetTone[asset.status]}>{asset.status}</Badge>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <p className="text-title">Health Check Status</p>
          <ol className="mt-4 space-y-3">
            {plan.health_checks.map((healthCheck) => (
              <li
                className="border-border border-t pt-3 first:border-t-0 first:pt-0"
                key={healthCheck.service}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-medium">{healthCheck.service}</p>
                    {healthCheck.endpoint ? (
                      <p className="text-caption text-muted mt-1">{healthCheck.endpoint}</p>
                    ) : null}
                    <p className="text-caption text-secondary mt-1">{healthCheck.description}</p>
                  </div>
                  <Badge tone={healthTone[healthCheck.status]}>{healthCheck.status}</Badge>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5">
          <p className="text-title">Deployment Recommendations</p>
          <ol className="mt-4 space-y-3">
            {plan.deployment_recommendations.map((recommendation) => (
              <li
                className="border-border border-t pt-3 first:border-t-0 first:pt-0"
                key={recommendation.target}
              >
                <p className="text-body font-medium capitalize">{recommendation.target}</p>
                <p className="text-caption text-secondary mt-1">{recommendation.recommendation}</p>
                <p className="text-caption text-muted mt-1">{recommendation.rationale}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {plan.missing_configuration.length ? (
        <Card className="border-warning/40 bg-warning/5 p-5">
          <p className="text-title">Missing Configuration</p>
          <ul className="text-body text-secondary mt-4 space-y-2">
            {plan.missing_configuration.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      {error ? <NotificationToast message={error} tone="danger" /> : null}
    </div>
  );
}
