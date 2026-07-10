/**
 * Typography System
 * 
 * Provides consistent typography classes and utilities.
 * All typography decisions are centralized here.
 */

/**
 * Typography presets for common text patterns
 * Each preset provides a complete set of Tailwind classes
 */
export const typography = {
  // Display - Marketing heroes, large headings
  displayLg: 'text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl',
  display: 'text-3xl font-bold tracking-tight sm:text-4xl',
  
  // Headings - Page and section titles
  h1: 'text-2xl font-bold sm:text-3xl',
  h2: 'text-xl font-semibold sm:text-2xl',
  h3: 'text-lg font-semibold',
  h4: 'text-base font-semibold',
  
  // Body text
  bodyLg: 'text-base text-gray-700',
  body: 'text-sm text-gray-700',
  bodySm: 'text-sm text-gray-600',
  
  // Muted/secondary text - STANDARDIZED to gray-500
  muted: 'text-sm text-gray-500',
  mutedSm: 'text-xs text-gray-500',
  
  // Labels
  label: 'text-sm font-medium text-gray-700',
  labelSm: 'text-xs font-medium text-gray-600',
  
  // Uppercase labels (for form fields)
  overline: 'text-xs font-semibold uppercase tracking-wide text-gray-500',
  
  // Captions and hints
  caption: 'text-xs text-gray-500',
  hint: 'text-xs text-gray-400',
  
  // Links
  link: 'text-purple-600 hover:text-purple-700 hover:underline',
  linkMuted: 'text-gray-500 hover:text-gray-700 hover:underline',
  
  // Numbers and data
  stat: 'text-2xl font-bold tabular-nums',
  statLg: 'text-3xl font-bold tabular-nums',
  mono: 'font-mono text-sm',
  
  // Card typography
  cardTitle: 'text-lg font-semibold text-gray-900',
  cardDescription: 'text-sm text-gray-500',
  
  // Error/success messages
  error: 'text-sm text-red-600',
  success: 'text-sm text-green-600',
} as const;

export type TypographyPreset = keyof typeof typography;

/**
 * Get typography classes for a preset
 */
export function getTypography(preset: TypographyPreset): string {
  return typography[preset];
}

/**
 * Text color classes - unified hierarchy
 */
export const textColors = {
  primary: 'text-gray-900',
  secondary: 'text-gray-700',
  muted: 'text-gray-500',      // STANDARDIZED: Use this for all muted text
  subtle: 'text-gray-400',
  inverse: 'text-white',
  brand: 'text-purple-600',
  brandDark: 'text-purple-700',
  error: 'text-red-600',
  success: 'text-green-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
} as const;

/**
 * Heading configurations for semantic HTML
 */
export const headingStyles = {
  page: typography.h1,           // Page titles
  section: typography.h2,        // Section headings
  card: typography.h3,           // Card titles
  subsection: typography.h4,     // Subsection headings
} as const;
