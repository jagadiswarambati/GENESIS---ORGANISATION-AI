import { cn } from "@/lib/utils";

const MAX_PROGRESS = 100;

export function ProgressBar({
  className,
  label,
  value,
}: Readonly<{ className?: string; label?: string; value: number }>): React.JSX.Element {
  const clampedValue = Math.min(MAX_PROGRESS, Math.max(0, value));
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="text-caption text-secondary flex justify-between">
          <span>{label}</span>
          <span>{clampedValue}%</span>
        </div>
      ) : null}
      <div
        aria-label={label ?? "Progress"}
        aria-valuemax={MAX_PROGRESS}
        aria-valuemin={0}
        aria-valuenow={clampedValue}
        className="bg-muted h-1.5 overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className="bg-primary duration-normal ease-standard h-full rounded-full transition-[width]"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
