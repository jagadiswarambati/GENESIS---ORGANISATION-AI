"use client";

import { useId } from "react";

export function DnaSlider({
  description,
  label,
  onValueChange,
  value,
}: Readonly<{
  description?: string;
  label: string;
  onValueChange?: (value: number) => void;
  value: number;
}>): React.JSX.Element {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-body font-medium" htmlFor={id}>
          {label}
        </label>
        <output className="text-caption text-secondary font-mono" htmlFor={id}>
          {value}
        </output>
      </div>
      {description ? <p className="text-caption text-muted">{description}</p> : null}
      <input
        aria-valuetext={`${value} out of 100`}
        className="genesis-range accent-primary w-full"
        id={id}
        max="100"
        min="0"
        onChange={(event) => onValueChange?.(Number(event.target.value))}
        type="range"
        value={value}
      />
    </div>
  );
}
