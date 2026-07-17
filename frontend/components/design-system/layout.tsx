import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SidebarContainer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }): React.JSX.Element {
  return (
    <aside
      className={cn("border-border bg-surface flex h-full w-64 flex-col border-r", className)}
      {...props}
    >
      {children}
    </aside>
  );
}

export function TopNavigation({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }): React.JSX.Element {
  return (
    <header
      className={cn(
        "border-border bg-surface flex min-h-14 items-center justify-between border-b px-4",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}

export function PageContainer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }): React.JSX.Element {
  return (
    <main className={cn("max-w-workspace mx-auto w-full px-5 py-8 sm:px-8", className)} {...props}>
      {children}
    </main>
  );
}

export function SectionHeader({
  action,
  description,
  eyebrow,
  title,
}: Readonly<{
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}>): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-label text-muted">{eyebrow}</p> : null}
        <h2 className="text-heading mt-1">{title}</h2>
        {description ? (
          <p className="max-w-reading text-body text-secondary mt-2">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
