import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const inputBase =
  "nga-input flex h-11 w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400";

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, hint, icon, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="nga-label mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </span>
          )}
          <input
            type={type}
            id={id}
            className={cn(
              inputBase,
              icon && "pl-10",
              error ? "border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50/50" : "border-gray-200 hover:border-purple-300 hover:bg-white",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              className
            )}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          />
        </div>
        {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
        {!error && hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputBase };
