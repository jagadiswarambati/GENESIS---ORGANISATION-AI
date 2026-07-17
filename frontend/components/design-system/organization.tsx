import type { ReactNode } from "react";

import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { Badge, StatusIndicator } from "./badge";
import { Card } from "./card";
import { ProgressBar } from "./progress";

type EntityCardProps = Readonly<{
  description?: string;
  meta?: string;
  name: string;
  status?: "active" | "paused" | "blocked" | "idle" | "processing";
}>;

function EntityCard({ description, meta, name, status }: EntityCardProps): React.JSX.Element {
  return (
    <Card className="duration-normal ease-standard hover:shadow-hover p-4 transition-[box-shadow,transform] hover:-translate-y-px">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title">{name}</h3>
          {description ? <p className="text-caption text-secondary mt-1">{description}</p> : null}
        </div>
        {status ? <StatusIndicator status={status} /> : null}
      </div>
      {meta ? (
        <p className="border-border text-caption text-muted mt-4 border-t pt-3">{meta}</p>
      ) : null}
    </Card>
  );
}

export function OrganizationCard(props: EntityCardProps): React.JSX.Element {
  return <EntityCard {...props} />;
}

export function DepartmentCard(props: EntityCardProps): React.JSX.Element {
  return <EntityCard {...props} />;
}

export function RoleCard(props: EntityCardProps): React.JSX.Element {
  return <EntityCard {...props} />;
}

export function WorkerCard(props: EntityCardProps): React.JSX.Element {
  return <EntityCard {...props} />;
}

export function MissionCard({
  description,
  progress,
  status,
  title,
}: Readonly<{
  description: string;
  progress: number;
  status: "active" | "paused" | "blocked" | "idle" | "processing";
  title: string;
}>): React.JSX.Element {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label text-muted">Mission</p>
          <h3 className="text-title mt-1">{title}</h3>
        </div>
        <StatusIndicator status={status} />
      </div>
      <p className="text-body text-secondary mt-2">{description}</p>
      <ProgressBar className="mt-5" label="Progress" value={progress} />
    </Card>
  );
}

export function TimelineCard({
  children,
  timestamp,
  title,
  tone = "info",
}: Readonly<{
  children: ReactNode;
  timestamp: string;
  title: string;
  tone?: "info" | "success" | "warning";
}>): React.JSX.Element {
  const toneClass = { info: "bg-info", success: "bg-success", warning: "bg-warning" }[tone];
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneClass)} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-body font-medium">{title}</h3>
          <time className="text-caption text-muted">{timestamp}</time>
        </div>
        <div className="text-body text-secondary mt-1">{children}</div>
      </div>
    </div>
  );
}

export function MetricCard({
  change,
  label,
  value,
}: Readonly<{ change?: string; label: string; value: string }>): React.JSX.Element {
  return (
    <Card className="p-4">
      <p className="text-label text-muted">{label}</p>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <strong className="text-heading">{value}</strong>
        {change ? <Badge tone="success">{change}</Badge> : null}
      </div>
    </Card>
  );
}

export function OrganizationGenerationPlaceholder(): React.JSX.Element {
  const Icon = icons.organization;
  return (
    <div
      aria-label="Organization generation placeholder"
      className="border-border bg-panel flex items-center gap-3 rounded-lg border p-4"
    >
      <span className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-md">
        <Icon aria-hidden="true" className="animate-breathe" size={18} />
      </span>
      <div>
        <p className="text-body font-medium">Organization formation</p>
        <p className="text-caption text-secondary">
          Motion primitive reserved for future generation feedback.
        </p>
      </div>
    </div>
  );
}
