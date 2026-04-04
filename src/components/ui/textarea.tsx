import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, hint, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          id={id}
          className={cn(
            "flex w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:opacity-70 resize-y min-h-[80px]",
            error ? "border-red-400 focus-visible:ring-red-500/40 focus-visible:border-red-500" : "border-gray-300 hover:border-gray-400",
            className
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
        {!error && hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
