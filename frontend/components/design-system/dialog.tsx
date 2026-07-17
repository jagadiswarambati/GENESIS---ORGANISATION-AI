"use client";

import { useEffect, useRef } from "react";

import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { Button } from "./button";

export type DialogProps = Readonly<{
  children: React.ReactNode;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}>;

export function Dialog({
  children,
  description,
  onOpenChange,
  open,
  title,
}: DialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? "genesis-dialog-description" : undefined}
      aria-labelledby="genesis-dialog-title"
      className="border-border bg-surface text-foreground shadow-floating backdrop:bg-overlay m-auto w-[min(calc(100%-2rem),32rem)] rounded-xl border p-0"
      onCancel={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-heading" id="genesis-dialog-title">
              {title}
            </h2>
            {description ? (
              <p className="text-body text-secondary mt-2" id="genesis-dialog-description">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            aria-label="Close dialog"
            onClick={() => onOpenChange(false)}
            size="icon"
            variant="ghost"
          >
            <icons.close aria-hidden="true" size={16} />
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  );
}

/** Modal is a semantic alias for teams that prefer product-language naming. */
export const Modal = Dialog;

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
