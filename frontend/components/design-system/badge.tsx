import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const toneVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-label uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-secondary",
        primary: "bg-primary/15 text-primary",
        accent: "bg-accent/15 text-accent",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-danger/15 text-danger",
        info: "bg-info/15 text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type ToneProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof toneVariants> & { children: ReactNode };

export function Badge({ className, tone, ...props }: ToneProps): React.JSX.Element {
  return <span className={cn(toneVariants({ tone }), className)} {...props} />;
}

export function Chip({ className, ...props }: HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span
      className={cn(
        "border-border bg-panel text-caption text-secondary inline-flex items-center rounded-md border px-2 py-1",
        className,
      )}
      {...props}
    />
  );
}

const statusTone = {
  active: "success",
  paused: "warning",
  blocked: "danger",
  idle: "neutral",
  processing: "info",
} as const;

export function StatusIndicator({
  status,
}: Readonly<{ status: keyof typeof statusTone }>): React.JSX.Element {
  const tone = statusTone[status];
  return (
    <Badge tone={tone}>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "processing" && "animate-gentle-pulse",
        )}
      />
      {status}
    </Badge>
  );
}
