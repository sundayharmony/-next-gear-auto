/**
 * Color System Utilities
 * 
 * Provides type-safe access to color tokens and helper functions
 * for working with the design system colors.
 */

export const colors = {
  primary: {
    50: 'var(--color-primary-50)',
    100: 'var(--color-primary-100)',
    200: 'var(--color-primary-200)',
    300: 'var(--color-primary-300)',
    400: 'var(--color-primary-400)',
    500: 'var(--color-primary-500)',
    600: 'var(--color-primary-600)',
    700: 'var(--color-primary-700)',
    800: 'var(--color-primary-800)',
    900: 'var(--color-primary-900)',
    950: 'var(--color-primary-950)',
  },
  gray: {
    50: 'var(--color-gray-50)',
    100: 'var(--color-gray-100)',
    200: 'var(--color-gray-200)',
    300: 'var(--color-gray-300)',
    400: 'var(--color-gray-400)',
    500: 'var(--color-gray-500)',
    600: 'var(--color-gray-600)',
    700: 'var(--color-gray-700)',
    800: 'var(--color-gray-800)',
    900: 'var(--color-gray-900)',
    950: 'var(--color-gray-950)',
  },
  success: {
    50: 'var(--color-success-50)',
    100: 'var(--color-success-100)',
    500: 'var(--color-success-500)',
    600: 'var(--color-success-600)',
    700: 'var(--color-success-700)',
  },
  warning: {
    50: 'var(--color-warning-50)',
    100: 'var(--color-warning-100)',
    500: 'var(--color-warning-500)',
    600: 'var(--color-warning-600)',
    700: 'var(--color-warning-700)',
  },
  error: {
    50: 'var(--color-error-50)',
    100: 'var(--color-error-100)',
    500: 'var(--color-error-500)',
    600: 'var(--color-error-600)',
    700: 'var(--color-error-700)',
  },
  info: {
    50: 'var(--color-info-50)',
    100: 'var(--color-info-100)',
    500: 'var(--color-info-500)',
    600: 'var(--color-info-600)',
    700: 'var(--color-info-700)',
  },
} as const;

/**
 * Tailwind class mappings for semantic colors
 * Use these for consistent color application across components
 */
export const colorClasses = {
  primary: {
    bg: 'bg-purple-600',
    bgHover: 'hover:bg-purple-700',
    bgLight: 'bg-purple-50',
    bgMuted: 'bg-purple-100',
    text: 'text-purple-600',
    textDark: 'text-purple-700',
    textLight: 'text-purple-400',
    border: 'border-purple-600',
    borderLight: 'border-purple-200',
    ring: 'ring-purple-500',
  },
  success: {
    bg: 'bg-green-600',
    bgLight: 'bg-green-50',
    bgMuted: 'bg-green-100',
    text: 'text-green-600',
    textDark: 'text-green-700',
    border: 'border-green-600',
    borderLight: 'border-green-200',
  },
  warning: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    bgMuted: 'bg-amber-100',
    text: 'text-amber-600',
    textDark: 'text-amber-700',
    border: 'border-amber-500',
    borderLight: 'border-amber-200',
  },
  error: {
    bg: 'bg-red-600',
    bgLight: 'bg-red-50',
    bgMuted: 'bg-red-100',
    text: 'text-red-600',
    textDark: 'text-red-700',
    border: 'border-red-600',
    borderLight: 'border-red-200',
  },
  info: {
    bg: 'bg-blue-600',
    bgLight: 'bg-blue-50',
    bgMuted: 'bg-blue-100',
    text: 'text-blue-600',
    textDark: 'text-blue-700',
    border: 'border-blue-600',
    borderLight: 'border-blue-200',
  },
  neutral: {
    bg: 'bg-gray-600',
    bgLight: 'bg-gray-50',
    bgMuted: 'bg-gray-100',
    text: 'text-gray-600',
    textDark: 'text-gray-700',
    border: 'border-gray-600',
    borderLight: 'border-gray-200',
  },
} as const;

export type SemanticColor = keyof typeof colorClasses;
