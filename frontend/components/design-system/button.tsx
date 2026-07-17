import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-body font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-standard focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-soft hover:shadow-hover hover:brightness-110",
        secondary:
          "border border-border bg-secondary text-secondary-foreground shadow-soft hover:bg-hover",
        ghost: "text-secondary hover:bg-hover hover:text-foreground",
        danger:
          "bg-danger text-danger-foreground shadow-soft hover:shadow-hover hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3 text-caption",
        md: "h-9 px-3.5",
        lg: "h-10 px-4 text-subtitle",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { children: ReactNode };

export function Button({ className, size, variant, ...props }: ButtonProps): React.JSX.Element {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} type="button" {...props} />
  );
}
