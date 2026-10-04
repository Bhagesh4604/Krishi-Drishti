// button-squircle.tsx - squircle button with variants
import * as React from "react";
import { cn } from "../../../src/lib/utils";
import { motion } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon-md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  squircle?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:     "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-sm",
  secondary:   "bg-muted hover:bg-accent text-foreground border border-muted",
  ghost:       "bg-transparent hover:bg-accent text-foreground border-transparent",
  destructive: "bg-red-500 hover:bg-red-400 text-white border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:       "px-3 py-1.5 text-xs rounded-lg",
  md:       "px-4 py-2 text-sm rounded-xl",
  lg:       "px-6 py-3 text-base rounded-2xl",
  "icon-sm":"w-7 h-7 rounded-lg p-0 flex items-center justify-center",
  "icon-md":"w-9 h-9 rounded-xl p-0 flex items-center justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", squircle = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          squircle && "rounded-xl",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
