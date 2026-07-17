import type { ReactNode } from "react";

import { Card } from "@/components/design-system/card";
import { cn } from "@/lib/utils";

export function OrganizationBriefCard({
  children,
  className,
  eyebrow,
  title,
}: Readonly<{
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title: string;
}>): React.JSX.Element {
  return (
    <Card className={cn("p-5", className)}>
      {eyebrow ? <p className="text-label text-muted">{eyebrow}</p> : null}
      <h2 className="text-title mt-1">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function OrganizationBriefList({
  items,
}: Readonly<{ items: ReadonlyArray<string> }>): React.JSX.Element {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li className="text-body text-secondary flex gap-3" key={item}>
          <span aria-hidden="true" className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
          {item}
        </li>
      ))}
    </ul>
  );
}
