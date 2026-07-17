"use client";

import { useState } from "react";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { Dialog, DialogFooter } from "@/components/design-system/dialog";
import { NotificationToast } from "@/components/design-system/feedback";
import type { ExportBundle, PackageManifest, ProjectPackage } from "@/lib/api/packaging";
import type { ValidationReport } from "@/lib/api/validation";
import type { VerificationReport } from "@/lib/api/verification";
import { formatMissionControlTime } from "@/lib/mission-control-session";

function formatPackageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function decodeArchive(archiveBase64: string): Blob {
  const binary = window.atob(archiveBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: "application/zip" });
}

export function ProjectExportPanel({
  exportBundle,
  includedFiles,
  isPackaging,
  isValidating,
  isVerifying,
  manifest,
  onRequestVerifiedPackage,
  projectPackage,
  validationReport,
  verificationReport,
}: Readonly<{
  exportBundle?: ExportBundle;
  includedFiles?: string[];
  isPackaging: boolean;
  isValidating: boolean;
  isVerifying: boolean;
  manifest?: PackageManifest;
  onRequestVerifiedPackage: () => Promise<ExportBundle | null>;
  projectPackage?: ProjectPackage;
  validationReport?: ValidationReport;
  verificationReport?: VerificationReport;
}>): React.JSX.Element {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const packageIsCurrent = exportBundle?.project_package.package_id === projectPackage?.package_id;
  const validationIsCurrent = Boolean(
    validationReport &&
    validationReport.source_package_id === projectPackage?.package_id &&
    validationReport.source_workspace_id === projectPackage?.source_workspace_id &&
    validationReport.source_workspace_updated_at === projectPackage?.source_workspace_updated_at,
  );
  const verificationIsCurrent = Boolean(
    verificationReport &&
    verificationReport.source_package_id === projectPackage?.package_id &&
    verificationReport.source_workspace_id === projectPackage?.source_workspace_id &&
    verificationReport.source_workspace_updated_at === projectPackage?.source_workspace_updated_at,
  );

  async function downloadPackage(): Promise<void> {
    setIsDownloading(true);
    setMessage(null);

    try {
      const bundle =
        exportBundle &&
        validationReport &&
        verificationReport &&
        packageIsCurrent &&
        validationIsCurrent &&
        verificationIsCurrent
          ? exportBundle
          : await onRequestVerifiedPackage();
      if (!bundle) return;

      const downloadUrl = window.URL.createObjectURL(decodeArchive(bundle.archive_base64));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = bundle.archive_file_name;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setMessage("Project ZIP download started.");
    } catch {
      setMessage("Genesis could not prepare the project ZIP. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function copyProjectSummary(): Promise<void> {
    if (!manifest || !projectPackage) return;

    const summary = [
      `Project: ${projectPackage.project_name}`,
      `Mission: ${manifest.mission_summary}`,
      `Organization: ${manifest.organization_summary}`,
      `Files: ${projectPackage.total_files}`,
      `Package size: ${formatPackageSize(projectPackage.total_size)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setMessage("Project summary copied.");
    } catch {
      setMessage("Genesis could not copy the project summary.");
    }
  }

  if (!projectPackage || !manifest) {
    return (
      <div className="border-border bg-surface flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <div>
          <p className="text-body text-secondary">
            {isPackaging
              ? "Packaging project workspace..."
              : "Project export is awaiting a workspace."}
          </p>
          <p className="text-caption text-muted mt-2">
            Genesis packages completed repositories automatically when the workspace is ready.
          </p>
          {!isPackaging && !isValidating && !isVerifying ? (
            <Button
              className="mt-4"
              onClick={() => void onRequestVerifiedPackage()}
              size="sm"
              variant="secondary"
            >
              Package Project
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <p className="text-label text-muted">Package status</p>
          <Badge className="mt-2" tone="success">
            Available
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Package size</p>
          <p className="text-title mt-2">{formatPackageSize(projectPackage.total_size)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">File count</p>
          <p className="text-title mt-2">{projectPackage.total_files}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Folder count</p>
          <p className="text-title mt-2">{manifest.repository_statistics.total_folders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Build status</p>
          <Badge
            className="mt-2 capitalize"
            tone={projectPackage.build_status === "ready" ? "success" : "info"}
          >
            {projectPackage.build_status}
          </Badge>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-title">{projectPackage.project_name}</p>
            <p className="text-caption text-secondary mt-1">
              Packaged {formatMissionControlTime(projectPackage.created_at)} · Version{" "}
              {projectPackage.package_version}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsPreviewOpen(true)} size="sm" variant="secondary">
              Preview Package
            </Button>
            <Button
              disabled={isDownloading || isPackaging || isValidating || isVerifying}
              onClick={downloadPackage}
              size="sm"
            >
              {isDownloading || isValidating
                ? "Validating Package"
                : isVerifying
                  ? "Verifying Package"
                  : "Download ZIP"}
            </Button>
            <Button onClick={copyProjectSummary} size="sm" variant="ghost">
              Copy Project Summary
            </Button>
          </div>
        </div>
      </Card>
      {!validationIsCurrent || !verificationIsCurrent ? (
        <p className="text-caption text-secondary">
          Genesis will validate and verify the current package before the ZIP is downloaded.
        </p>
      ) : null}
      {message ? <NotificationToast message={message} tone="info" /> : null}
      <Dialog
        description="Review the manifest and repository files embedded in the ZIP package."
        onOpenChange={setIsPreviewOpen}
        open={isPreviewOpen}
        title="Package Manifest"
      >
        <pre className="border-border bg-panel text-caption max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border p-4">
          {JSON.stringify(manifest, null, 2)}
        </pre>
        <div className="mt-5">
          <p className="text-label text-muted">Included files</p>
          {includedFiles?.length ? (
            <ul className="border-border bg-panel text-caption mt-3 max-h-48 overflow-auto rounded-lg border p-3">
              {includedFiles.map((filePath) => (
                <li className="border-border border-b py-1 last:border-0" key={filePath}>
                  {filePath}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-secondary mt-2">
              Repackage the project to preview its current file listing.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
