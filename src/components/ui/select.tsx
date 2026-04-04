import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { inputBase } from "./input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, hint, icon, id, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </span>
          )}
          <select
            id={id}
            className={cn(
              inputBase,
              "appearance-none cursor-pointer pr-9",
              icon && "pl-9",
              error ? "border-red-400 focus-visible:ring-red-500/40 focus-visible:border-red-500" : "border-gray-300 hover:border-gray-400",
              className
            )}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          >
            {children}
          </select>
          {/* Chevron */}
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
        {!error && hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
