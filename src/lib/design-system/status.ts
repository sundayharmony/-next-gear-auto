/**
 * Unified Status System
 * 
 * Consolidates all status-related styling into a single source of truth.
 * This replaces the scattered status color definitions across:
 * - src/lib/utils/status-colors.ts
 * - Badge component variants
 * - OwnerStatusBadge
 * - PayoutStatusBadge
 * - Ticket status colors
 * - Timeline accent colors
 */

/**
 * All possible status values across the application
 */
export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export type PaymentStatus =
  | 'paid'
  | 'unpaid'
  | 'partial'
  | 'refunded'
  | 'overdue';

export type MaintenanceStatus =
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export type TicketStatus =
  | 'unpaid'
  | 'paid'
  | 'disputed'
  | 'dismissed';

export type GenericStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default';

export type AnyStatus = BookingStatus | PaymentStatus | MaintenanceStatus | TicketStatus | GenericStatus;

/**
 * Status color configuration
 * Each status maps to a consistent set of Tailwind classes
 */
export interface StatusColors {
  bg: string;
  text: string;
  border: string;
  dot?: string;
}

/**
 * Unified status color map
 * All status colors are defined here for consistency
 */
export const statusColorMap: Record<AnyStatus, StatusColors> = {
  // Booking statuses
  pending: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  confirmed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  active: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  completed: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  'no-show': {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  
  // Payment statuses
  paid: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  unpaid: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  partial: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  refunded: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  overdue: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  
  // Maintenance statuses
  scheduled: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  'in-progress': {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  
  // Ticket statuses (reuse payment where applicable)
  disputed: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  dismissed: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  
  // Generic statuses
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  warning: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  default: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
};

/**
 * Get status colors for a given status
 * Falls back to 'default' if status is not recognized
 */
export function getStatusColors(status: string): StatusColors {
  return statusColorMap[status as AnyStatus] ?? statusColorMap.default;
}

/**
 * Get combined class string for a status badge
 */
export function getStatusBadgeClasses(status: string): string {
  const colors = getStatusColors(status);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

/**
 * Status display labels
 * Maps internal status values to user-friendly labels
 */
export const statusLabels: Record<string, string> = {
  // Booking
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No Show',
  
  // Payment
  paid: 'Paid',
  unpaid: 'Unpaid',
  partial: 'Partial',
  refunded: 'Refunded',
  overdue: 'Overdue',
  
  // Maintenance
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  
  // Ticket
  disputed: 'Disputed',
  dismissed: 'Dismissed',
  
  // Generic
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
  default: 'Unknown',
};

/**
 * Get display label for a status
 */
export function getStatusLabel(status: string): string {
  return statusLabels[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');
}

/**
 * Timeline/Calendar border accent colors
 * Used for left borders on booking cards in timeline views
 */
export const timelineAccentColors: Record<string, string> = {
  pending: 'border-l-amber-500',
  confirmed: 'border-l-green-500',
  active: 'border-l-blue-500',
  completed: 'border-l-gray-400',
  cancelled: 'border-l-red-500',
  'no-show': 'border-l-orange-500',
  turo: 'border-l-teal-500',
  blocked: 'border-l-slate-400',
};

/**
 * Get timeline accent class for a status
 */
export function getTimelineAccent(status: string): string {
  return timelineAccentColors[status] ?? 'border-l-gray-400';
}
