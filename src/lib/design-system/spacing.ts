/**
 * Spacing System
 * 
 * Provides consistent spacing classes and utilities.
 * Standardizes all padding, margin, and gap values.
 */

/**
 * Spacing presets for common layout patterns
 */
export const spacing = {
  // Page-level spacing
  pageY: 'py-6 sm:py-8',
  pageX: 'px-4 sm:px-6 lg:px-8',
  page: 'px-4 py-6 sm:px-6 sm:py-8 lg:px-8',
  
  // Section spacing
  sectionGap: 'space-y-6',
  sectionGapSm: 'space-y-4',
  sectionGapLg: 'space-y-8',
  
  // Card padding
  cardPadding: 'p-6',
  cardPaddingSm: 'p-4',
  cardPaddingLg: 'p-8',
  
  // Card padding responsive (mobile-first)
  cardPaddingResponsive: 'p-4 sm:p-6',
  
  // Content gaps
  contentGap: 'gap-4',
  contentGapSm: 'gap-2',
  contentGapLg: 'gap-6',
  
  // Stack spacing (vertical)
  stack: 'space-y-4',
  stackSm: 'space-y-2',
  stackLg: 'space-y-6',
  stackXs: 'space-y-1',
  
  // Inline spacing (horizontal)
  inline: 'space-x-4',
  inlineSm: 'space-x-2',
  inlineLg: 'space-x-6',
  
  // Grid gaps
  gridGap: 'gap-4 sm:gap-6',
  gridGapSm: 'gap-2 sm:gap-3',
  gridGapLg: 'gap-6 sm:gap-8',
  
  // Form spacing
  formGap: 'space-y-4',
  formFieldGap: 'space-y-1.5',
  
  // Button/action spacing
  actionGap: 'gap-2',
  actionGapSm: 'gap-1.5',
  
  // Table cell padding
  cellPadding: 'px-4 py-3',
  cellPaddingSm: 'px-3 py-2',
} as const;

export type SpacingPreset = keyof typeof spacing;

/**
 * Get spacing classes for a preset
 */
export function getSpacing(preset: SpacingPreset): string {
  return spacing[preset];
}

/**
 * Container max-width classes
 */
export const containers = {
  full: 'w-full',
  prose: 'max-w-prose',
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  
  // Semantic containers
  page: 'max-w-7xl mx-auto',
  pageNarrow: 'max-w-4xl mx-auto',
  content: 'max-w-3xl mx-auto',
  modal: 'max-w-lg',
  modalLg: 'max-w-2xl',
  sheet: 'max-w-md',
  sheetLg: 'max-w-xl',
} as const;

/**
 * Grid column configurations
 */
export const gridCols = {
  // Stat grids
  stats2: 'grid-cols-2',
  stats3: 'grid-cols-1 sm:grid-cols-3',
  stats4: 'grid-cols-2 sm:grid-cols-4',
  stats5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  
  // Content grids
  content2: 'grid-cols-1 lg:grid-cols-2',
  content3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  content4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  
  // Form grids
  form2: 'grid-cols-1 sm:grid-cols-2',
  form3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  form4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  
  // Calendar
  calendar7: 'grid-cols-7',
} as const;

/**
 * Flex layouts
 */
export const flex = {
  row: 'flex flex-row',
  col: 'flex flex-col',
  rowReverse: 'flex flex-row-reverse',
  colReverse: 'flex flex-col-reverse',
  
  // Common alignments
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between',
  start: 'flex items-center justify-start',
  end: 'flex items-center justify-end',
  
  // Stretch
  stretch: 'flex items-stretch',
  
  // Wrap
  wrap: 'flex flex-wrap',
  wrapReverse: 'flex flex-wrap-reverse',
  
  // Common patterns
  toolbar: 'flex items-center justify-between gap-4',
  actions: 'flex items-center gap-2',
  stack: 'flex flex-col gap-4',
  inline: 'inline-flex items-center gap-2',
} as const;
