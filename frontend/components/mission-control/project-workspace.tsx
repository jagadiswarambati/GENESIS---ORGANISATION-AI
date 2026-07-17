"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { Dialog, DialogFooter } from "@/components/design-system/dialog";
import { NotificationToast } from "@/components/design-system/feedback";
import { SearchInput } from "@/components/design-system/search-input";
import {
  type ProjectWorkspace,
  type WorkspaceFile,
  type WorkspaceFolder,
} from "@/lib/api/workspace";
import { formatMissionControlTime } from "@/lib/mission-control-session";
import { cn } from "@/lib/utils";

function flattenFolders(folder: WorkspaceFolder): WorkspaceFolder[] {
  return [folder, ...folder.child_folders.flatMap(flattenFolders)];
}

function flattenFiles(folder: WorkspaceFolder): WorkspaceFile[] {
  return [
    ...folder.child_files,
    ...folder.child_folders.flatMap((childFolder) => flattenFiles(childFolder)),
  ];
}

function formatProjectSize(files: WorkspaceFile[]): string {
  const size = files.reduce((total, file) => total + file.file_content.length, 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function WorkspaceFileDialog({
  file,
  onClose,
}: Readonly<{
  file: WorkspaceFile | null;
  onClose: () => void;
}>): React.JSX.Element {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function copyContent(): Promise<void> {
    if (!file) return;

    try {
      await navigator.clipboard.writeText(file.file_content);
      setCopyMessage("Workspace file content copied.");
    } catch {
      setCopyMessage("Genesis could not copy the workspace file content.");
    }
  }

  return (
    <Dialog
      description={file ? `${file.file_path} · Version ${file.version}` : undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={Boolean(file)}
      title={file?.file_name ?? "Workspace file"}
    >
      {file ? (
        <>
          <pre className="border-border bg-panel text-caption max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border p-4">
            {file.file_content}
          </pre>
          {copyMessage ? <NotificationToast message={copyMessage} tone="info" /> : null}
          <DialogFooter>
            <Button onClick={copyContent} variant="secondary">
              Copy content
            </Button>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </>
      ) : null}
    </Dialog>
  );
}

export function ProjectWorkspacePanel({
  workspace,
}: Readonly<{
  workspace?: ProjectWorkspace;
}>): React.JSX.Element {
  const [selectedFolderPath, setSelectedFolderPath] = useState("/");
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const folders = useMemo(
    () => (workspace ? flattenFolders(workspace.root_folder) : []),
    [workspace],
  );
  const allFiles = useMemo(
    () => (workspace ? flattenFiles(workspace.root_folder) : []),
    [workspace],
  );
  const selectedFolder =
    folders.find((folder) => folder.folder_path === selectedFolderPath) ?? workspace?.root_folder;
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleFiles = (normalizedQuery ? allFiles : (selectedFolder?.child_files ?? [])).filter(
    (file) =>
      [file.department, file.file_name, file.file_path].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      ),
  );

  if (!workspace) {
    return (
      <div className="border-border bg-surface flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <div>
          <p className="text-body text-secondary">
            Project workspace is awaiting completed artifacts.
          </p>
          <p className="text-caption text-muted mt-2">
            Genesis will organize completed artifact files into a browseable repository.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-label text-muted">Files</p>
          <p className="text-title mt-2">{workspace.total_files}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Folders</p>
          <p className="text-title mt-2">{workspace.total_folders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Project size</p>
          <p className="text-title mt-2">{formatProjectSize(allFiles)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Last generated</p>
          <p className="text-caption text-secondary mt-2">
            {formatMissionControlTime(workspace.last_updated)}
          </p>
          <Badge
            className="mt-2 capitalize"
            tone={workspace.build_status === "ready" ? "success" : "info"}
          >
            {workspace.build_status}
          </Badge>
        </Card>
      </div>

      <SearchInput
        aria-label="Search workspace files"
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search workspace files"
        value={searchQuery}
      />

      <div className="border-border grid overflow-hidden rounded-lg border lg:grid-cols-[minmax(12rem,0.8fr)_minmax(0,2fr)]">
        <nav
          aria-label="Workspace folders"
          className="border-border bg-surface border-b p-3 lg:border-b-0 lg:border-r"
        >
          <p className="text-label text-muted px-2 pb-2">Folder tree</p>
          <ul className="space-y-1">
            {folders.map((folder) => (
              <li key={folder.folder_path}>
                <button
                  aria-pressed={selectedFolder?.folder_path === folder.folder_path}
                  className={cn(
                    "text-caption hover:bg-hover focus-visible:outline-focus w-full rounded-md px-2 py-2 text-left transition-colors",
                    selectedFolder?.folder_path === folder.folder_path
                      ? "bg-hover text-foreground"
                      : "text-secondary",
                  )}
                  onClick={() => {
                    setSelectedFolderPath(folder.folder_path);
                    setSearchQuery("");
                  }}
                  style={{
                    paddingLeft: `${Math.max(8, folder.folder_path.split("/").length * 8)}px`,
                  }}
                  type="button"
                >
                  {folder.folder_path === "/"
                    ? workspace.root_folder.folder_name
                    : folder.folder_name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="bg-panel min-h-64 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-body font-medium">
                {normalizedQuery ? "Search results" : (selectedFolder?.folder_path ?? "/")}
              </p>
              <p className="text-caption text-muted mt-1">
                {visibleFiles.length} {visibleFiles.length === 1 ? "file" : "files"}
              </p>
            </div>
            <Badge tone="neutral">Repository</Badge>
          </div>
          {visibleFiles.length ? (
            <ul className="mt-4 space-y-2">
              {visibleFiles.map((file) => (
                <li key={file.file_path}>
                  <button
                    className="border-border bg-surface hover:bg-hover focus-visible:outline-focus w-full rounded-lg border p-3 text-left transition-colors"
                    onClick={() => setSelectedFile(file)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-body font-medium">{file.file_name}</span>
                      <Badge tone="info">{file.department}</Badge>
                    </div>
                    <p className="text-caption text-muted mt-1">{file.file_path}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-border mt-4 flex min-h-32 items-center justify-center rounded-lg border border-dashed p-4 text-center">
              <p className="text-caption text-secondary">No files match this view.</p>
            </div>
          )}
        </div>
      </div>
      <WorkspaceFileDialog file={selectedFile} onClose={() => setSelectedFile(null)} />
    </div>
  );
}
