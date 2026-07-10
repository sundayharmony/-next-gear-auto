/**
 * UI Components Barrel Export
 * 
 * Central export for all primitive UI components.
 * Import from @/components/ui for convenience.
 */

// Button
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

// Input
export { Input } from "./input";
export type { InputProps } from "./input";

// Label
export { Label } from "./label";
export type { LabelProps } from "./label";

// Card
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./card";
export type { CardProps } from "./card";

// Badge
export { Badge, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";

// StatusBadge - Unified status display
export { StatusBadge, BookingStatusBadge, PaymentStatusBadge } from "./status-badge";
export type { StatusBadgeProps } from "./status-badge";

// Skeleton - Loading states
export { 
  Skeleton, 
  SkeletonText, 
  SkeletonCircle, 
  SkeletonCard,
  DashboardSkeleton, 
  ListSkeleton,
  TableSkeleton,
  StatGridSkeleton,
} from "./skeleton";

// Toast
export { ToastNotification, ToastContainer } from "./toast";

// Modal
export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "./modal";

// Sheet
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "./sheet";
