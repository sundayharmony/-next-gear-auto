"use client";

import { useState, useCallback } from "react";
import { validate, type ValidationRules } from "@/lib/utils/validation";

interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useForm<T extends Record<string, string>>({
  initialValues,
  validationRules = {},
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const setValue = useCallback(
    (field: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      // Real-time validation on touched fields
      if (touched[field]) {
        const rule = validationRules[field as string];
        if (!rule) return;
        const error = validate(value, rule);
        setErrors((prev) => ({ ...prev, [field]: error || undefined }));
      }
    },
    [touched, validationRules]
  );

  const setFieldTouched = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      // Validate on blur
      const rule = validationRules[field as string];
      if (!rule) return;
      const error = validate(values[field], rule);
      setErrors((prev) => ({ ...prev, [field]: error || undefined }));
    },
    [values, validationRules]
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const field of Object.keys(validationRules)) {
      const rule = validationRules[field];
      if (!rule) continue;
      const error = validate(values[field as keyof T] || "", rule);
      if (error) {
        newErrors[field as keyof T] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!validateAll()) return;
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateAll, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  const register = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValue(field, e.target.value),
      onBlur: () => setFieldTouched(field),
      error: errors[field],
      id: field as string,
      name: field as string,
    }),
    [values, errors, setValue, setFieldTouched]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    setValue,
    setFieldTouched,
    validateAll,
    handleSubmit,
    reset,
    register,
  };
}
