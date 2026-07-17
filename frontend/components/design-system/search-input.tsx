import type { InputHTMLAttributes } from "react";

import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  const Icon = icons.search;
  return (
    <label
      className={cn(
        "border-border bg-panel text-secondary duration-fast focus-within:border-focus flex h-9 items-center gap-2 rounded-md border px-3 transition-colors",
        className,
      )}
    >
      <Icon aria-hidden="true" size={15} />
      <input
        className="text-body text-foreground placeholder:text-muted min-w-0 flex-1 bg-transparent outline-none"
        type="search"
        {...props}
      />
    </label>
  );
}
