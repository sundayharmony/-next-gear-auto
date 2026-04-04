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
          <label htmlFor={id} className="nga-label mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {label}
          </label>
        )}
        <textarea
          id={id}
          className={cn(
            "nga-input flex w-full rounded-xl border bg-gray-50 px-3.5 py-3 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 resize-y min-h-[88px]",
            error ? "border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50/50" : "border-gray-200 hover:border-purple-300 hover:bg-white",
            className
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
        {!error && hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
