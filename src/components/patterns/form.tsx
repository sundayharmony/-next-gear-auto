/**
 * Form Components
 * 
 * Unified form layout components for consistent form styling.
 * Replaces various inline form patterns:
 * - FormSection with title/description
 * - FormRow for side-by-side fields
 * - FormActions for submit/cancel buttons
 * - FormField for label + input + error
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/label";

// =============================================================================
// FormSection - Grouping related fields
// =============================================================================

export interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Form fields */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Section for grouping related form fields.
 * 
 * @example
 * <FormSection title="Contact Information" description="How we can reach you">
 *   <FormField label="Email">
 *     <Input type="email" />
 *   </FormField>
 *   <FormField label="Phone">
 *     <Input type="tel" />
 *   </FormField>
 * </FormSection>
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="border-b border-gray-200 pb-3">
          {title && (
            <legend className="text-base font-semibold text-gray-900">
              {title}
            </legend>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

// =============================================================================
// FormRow - Side-by-side fields
// =============================================================================

export interface FormRowProps {
  /** Form fields */
  children: React.ReactNode;
  /** Number of columns */
  cols?: 2 | 3 | 4;
  /** Additional CSS classes */
  className?: string;
}

const colsClasses = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Row for side-by-side form fields.
 * 
 * @example
 * <FormRow cols={2}>
 *   <FormField label="First Name">
 *     <Input />
 *   </FormField>
 *   <FormField label="Last Name">
 *     <Input />
 *   </FormField>
 * </FormRow>
 */
export function FormRow({
  children,
  cols = 2,
  className,
}: FormRowProps) {
  return (
    <div className={cn("grid gap-4", colsClasses[cols], className)}>
      {children}
    </div>
  );
}

// =============================================================================
// FormField - Label + input + error wrapper
// =============================================================================

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** HTML for attribute (auto-generated if not provided) */
  htmlFor?: string;
  /** Field description/hint */
  description?: string;
  /** Error message */
  error?: string;
  /** Is field required */
  required?: boolean;
  /** Form control */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wrapper for form field with label, input, and error.
 * 
 * @example
 * <FormField label="Email" required error={errors.email}>
 *   <Input type="email" {...register("email")} />
 * </FormField>
 */
export function FormField({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  const id = htmlFor ?? React.useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium text-gray-700",
          error && "text-red-700"
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>, {
            id,
            "aria-invalid": !!error,
            "aria-describedby": error ? `${id}-error` : undefined,
          })
        : children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// FormActions - Submit/cancel button row
// =============================================================================

export interface FormActionsProps {
  /** Action buttons */
  children: React.ReactNode;
  /** Alignment */
  align?: "left" | "right" | "center" | "between";
  /** Add top border */
  bordered?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const alignClasses = {
  left: "justify-start",
  right: "justify-end",
  center: "justify-center",
  between: "justify-between",
};

/**
 * Action button row for forms.
 * 
 * @example
 * <FormActions align="right">
 *   <Button variant="ghost" onClick={onCancel}>Cancel</Button>
 *   <Button type="submit" loading={isSubmitting}>Save</Button>
 * </FormActions>
 */
export function FormActions({
  children,
  align = "right",
  bordered = false,
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        alignClasses[align],
        bordered && "border-t border-gray-200 pt-4 mt-6",
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// FormCard - Form inside a card wrapper
// =============================================================================

export interface FormCardProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Form content */
  children: React.ReactNode;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Form wrapped in a card with optional title and actions.
 * 
 * @example
 * <FormCard
 *   title="Edit Profile"
 *   onSubmit={handleSubmit}
 *   actions={
 *     <FormActions>
 *       <Button type="submit">Save</Button>
 *     </FormActions>
 *   }
 * >
 *   <FormField label="Name">
 *     <Input {...register("name")} />
 *   </FormField>
 * </FormCard>
 */
export function FormCard({
  title,
  description,
  children,
  actions,
  className,
  ...formProps
}: FormCardProps) {
  return (
    <form
      {...formProps}
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {(title || description) && (
        <div className="border-b border-gray-200 px-6 py-4">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="p-6 space-y-4">{children}</div>
      {actions && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl">
          {actions}
        </div>
      )}
    </form>
  );
}

export default FormSection;
