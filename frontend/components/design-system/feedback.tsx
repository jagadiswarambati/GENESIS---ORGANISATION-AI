import type { ReactNode } from "react";

import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { Button } from "./button";

export function LoadingIndicator({
  label = "Loading",
}: Readonly<{ label?: string }>): React.JSX.Element {
  const Icon = icons.loading;
  return (
    <span className="text-body text-secondary inline-flex items-center gap-2">
      <Icon aria-hidden="true" className="animate-soft-spin" size={16} />
      <span>{label}</span>
    </span>
  );
}

export function Skeleton({ className }: Readonly<{ className?: string }>): React.JSX.Element {
  return (
    <div aria-hidden="true" className={cn("animate-gentle-pulse bg-muted rounded-md", className)} />
  );
}

type StateProps = {
  action?: { label: string; onClick: () => void };
  description: string;
  title: string;
};

function StateFrame({
  action,
  children,
  description,
  title,
}: StateProps & { children: ReactNode }): React.JSX.Element {
  return (
    <div className="border-border bg-panel flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
      <div className="text-secondary mb-4">{children}</div>
      <h3 className="text-title">{title}</h3>
      <p className="max-w-reading text-body text-secondary mt-2">{description}</p>
      {action ? (
        <Button className="mt-5" onClick={action.onClick} variant="secondary">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState(props: StateProps): React.JSX.Element {
  const Icon = icons.organization;
  return (
    <StateFrame {...props}>
      <Icon aria-hidden="true" size={24} />
    </StateFrame>
  );
}

export function ErrorState(props: StateProps): React.JSX.Element {
  const Icon = icons.alert;
  return (
    <StateFrame {...props}>
      <Icon aria-hidden="true" size={24} />
    </StateFrame>
  );
}

export function NotificationToast({
  message,
  tone = "info",
}: Readonly<{
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
}>): React.JSX.Element {
  return (
    <div
      className={cn(
        "text-body shadow-floating flex items-center gap-3 rounded-lg border px-3 py-2",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
        tone === "danger" && "border-danger/30 bg-danger/10 text-danger",
        tone === "info" && "border-info/30 bg-info/10 text-info",
      )}
      role="status"
    >
      {message}
    </div>
  );
}
