/**
 * Pattern Components Barrel Export
 * 
 * Composite components built on top of UI primitives.
 * These implement common UI patterns used across the application.
 */

// Layout
export { PageHeader } from "./page-header";
export type { PageHeaderProps } from "./page-header";

export { PageBody } from "./page-body";
export type { PageBodyProps } from "./page-body";

export { Section } from "./section";
export type { SectionProps } from "./section";

// Stats
export { StatGrid, StatCard } from "./stat-grid";
export type { StatGridProps, StatCardProps } from "./stat-grid";

// Data Display
export { FilterBar, FilterPills, SearchInput } from "./filter-bar";
export type { FilterBarProps, FilterPillsProps, FilterPillOption, SearchInputProps } from "./filter-bar";

export { CardList } from "./card-list";
export type { CardListProps, CardListItem } from "./card-list";

// Forms
export { FormSection, FormRow, FormField, FormActions, FormCard } from "./form";
export type { FormSectionProps, FormRowProps, FormFieldProps, FormActionsProps, FormCardProps } from "./form";

// States
export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";

export { LoadingState } from "./loading-state";
export type { LoadingStateProps } from "./loading-state";

export { ErrorState } from "./error-state";
export type { ErrorStateProps } from "./error-state";

// Dialogs
export { ConfirmDialog } from "./confirm-dialog";
export type { ConfirmDialogProps } from "./confirm-dialog";

// Navigation
export { Breadcrumbs } from "./breadcrumbs";
export type { BreadcrumbsProps, BreadcrumbItem } from "./breadcrumbs";

export { Tabs } from "./tabs";
export type { TabsProps, TabItem } from "./tabs";
