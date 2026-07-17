import { icons } from "@/lib/icons";

export function CommandPalettePlaceholder(): React.JSX.Element {
  const Icon = icons.command;
  return (
    <button
      aria-label="Open command palette"
      className="border-border bg-panel text-body text-muted duration-fast hover:bg-hover hover:text-secondary flex h-9 w-full items-center gap-2 rounded-md border px-3 transition-colors sm:max-w-xs"
      type="button"
    >
      <Icon aria-hidden="true" size={15} />
      <span className="flex-1 text-left">Search commands</span>
      <kbd className="border-border text-caption rounded border px-1.5 py-0.5 font-mono">⌘ K</kbd>
    </button>
  );
}
