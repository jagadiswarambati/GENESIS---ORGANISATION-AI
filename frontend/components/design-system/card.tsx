import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn("border-border bg-surface shadow-soft rounded-xl border", className)}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>): React.JSX.Element {
  return (
    <section
      className={cn("border-border bg-panel shadow-soft rounded-xl border", className)}
      {...props}
    />
  );
}
