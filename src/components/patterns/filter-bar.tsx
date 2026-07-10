/**
 * FilterBar Components
 * 
 * Unified filtering components for tables and lists.
 * Standardizes the various filter patterns:
 * - Pill/chip button groups (status filters)
 * - Search inputs
 * - Select dropdowns
 * - Date range pickers
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// =============================================================================
// Filter Pills - For status/category filtering
// =============================================================================

export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterPillsProps {
  /** Available options */
  options: FilterPillOption[];
  /** Currently selected value */
  value: string;
  /** Selection handler */
  onChange: (value: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default";
}

/**
 * Pill button group for categorical filtering.
 * 
 * @example
 * <FilterPills
 *   options={[
 *     { value: 'all', label: 'All' },
 *     { value: 'active', label: 'Active', count: 5 },
 *     { value: 'pending', label: 'Pending', count: 3 },
 *   ]}
 *   value={status}
 *   onChange={setStatus}
 * />
 */
export function FilterPills({
  options,
  value,
  onChange,
  className,
  size = "default",
}: FilterPillsProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1",
        className
      )}
      role="group"
      aria-label="Filter options"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-md font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === option.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 text-xs",
                value === option.value
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Search Input - Debounced search with icon
// =============================================================================

export interface SearchInputProps {
  /** Search value */
  value: string;
  /** Value change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Debounce delay in ms (0 for no debounce) */
  debounceMs?: number;
  /** Show clear button when has value */
  clearable?: boolean;
}

/**
 * Search input with icon and optional debouncing.
 * 
 * @example
 * <SearchInput
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search customers..."
 *   debounceMs={300}
 * />
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  debounceMs = 0,
  clearable = true,
}: SearchInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    if (debounceMs > 0) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="search"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {clearable && localValue && (
        <button
          type="button"
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Filter Bar Container - Combines multiple filters
// =============================================================================

export interface FilterBarProps {
  /** Filter bar content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Clear all filters callback */
  onClear?: () => void;
  /** Show clear button */
  showClear?: boolean;
}

/**
 * Container for combining multiple filter controls.
 * 
 * @example
 * <FilterBar onClear={clearFilters} showClear={hasFilters}>
 *   <FilterPills options={statusOptions} value={status} onChange={setStatus} />
 *   <SearchInput value={search} onChange={setSearch} />
 *   <Select value={vehicle} onChange={setVehicle}>...</Select>
 * </FilterBar>
 */
export function FilterBar({
  children,
  className,
  onClear,
  showClear = false,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center",
        className
      )}
    >
      {children}
      {showClear && onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}

export default FilterBar;
