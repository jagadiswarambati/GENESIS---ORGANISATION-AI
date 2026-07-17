"use client";

import { useState } from "react";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { Dialog, DialogFooter } from "@/components/design-system/dialog";
import { NotificationToast } from "@/components/design-system/feedback";
import type { ArtifactCollection, MissionArtifact } from "@/lib/api/artifacts";
import type { WorkerAssignmentResult } from "@/lib/api/worker-assignment";
import { formatMissionControlTime } from "@/lib/mission-control-session";

function ArtifactViewer({
  artifact,
  workerAssignmentResult,
}: Readonly<{
  artifact: MissionArtifact;
  workerAssignmentResult?: WorkerAssignmentResult;
}>): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const workerName =
    workerAssignmentResult?.workers.find((worker) => worker.worker_id === artifact.worker_id)
      ?.worker_name ?? artifact.worker_id;

  async function copyContent(): Promise<void> {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopyMessage("Artifact content copied.");
    } catch {
      setCopyMessage("Genesis could not copy the artifact content.");
    }
  }

  return (
    <Card className="bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-body font-medium">{artifact.artifact_name}</p>
          <p className="text-caption text-secondary mt-1">{artifact.description}</p>
        </div>
        <Badge className="capitalize" tone={artifact.status === "generated" ? "success" : "danger"}>
          {artifact.status}
        </Badge>
      </div>
      <dl className="text-caption text-muted mt-3 grid gap-1 sm:grid-cols-2">
        <div>
          <dt className="inline">Department: </dt>
          <dd className="inline">{artifact.department}</dd>
        </div>
        <div>
          <dt className="inline">Worker: </dt>
          <dd className="inline">{workerName}</dd>
        </div>
        <div>
          <dt className="inline">File type: </dt>
          <dd className="inline">{artifact.artifact_type}</dd>
        </div>
        <div>
          <dt className="inline">Generated: </dt>
          <dd className="inline">{formatMissionControlTime(artifact.generated_at)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => setIsOpen(true)} size="sm" variant="secondary">
          View artifact
        </Button>
        <Button onClick={() => setShowPreview((value) => !value)} size="sm" variant="ghost">
          {showPreview ? "Hide preview" : "Preview content"}
        </Button>
        <Button onClick={copyContent} size="sm" variant="ghost">
          Copy content
        </Button>
      </div>
      {showPreview ? (
        <pre className="border-border bg-panel text-caption mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border p-3">
          {artifact.content}
        </pre>
      ) : null}
      {copyMessage ? <NotificationToast message={copyMessage} tone="info" /> : null}
      <Dialog
        description={`${artifact.artifact_type} · Version ${artifact.version}`}
        onOpenChange={setIsOpen}
        open={isOpen}
        title={artifact.artifact_name}
      >
        <pre className="border-border bg-panel text-caption max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border p-4">
          {artifact.content}
        </pre>
        <DialogFooter>
          <Button onClick={copyContent} variant="secondary">
            Copy content
          </Button>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </Card>
  );
}

export function MissionArtifacts({
  artifactCollection,
  workerAssignmentResult,
}: Readonly<{
  artifactCollection?: ArtifactCollection;
  workerAssignmentResult?: WorkerAssignmentResult;
}>): React.JSX.Element {
  const artifacts = artifactCollection?.artifacts ?? [];

  if (!artifacts.length) {
    return (
      <div className="border-border bg-surface mt-6 flex min-h-32 items-center justify-center rounded-lg border border-dashed">
        <span className="text-body text-secondary">No artifacts generated.</span>
      </div>
    );
  }

  return (
    <ol className="mt-6 space-y-3">
      {[...artifacts]
        .sort((left, right) => right.generated_at.localeCompare(left.generated_at))
        .map((artifact) => (
          <li key={artifact.artifact_id}>
            <ArtifactViewer artifact={artifact} workerAssignmentResult={workerAssignmentResult} />
          </li>
        ))}
    </ol>
  );
}
