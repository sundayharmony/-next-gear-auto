"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { AdminEmptyState } from "@/components/admin/ui-feedback";
import { ListSkeleton } from "@/components/admin/skeleton";
import { formatDate } from "@/lib/utils/date-helpers";
import type { CustomerRow } from "../use-customers-data";

type CustomerSort = "name" | "recent";

export function CustomerListPanel({
  customers,
  paginatedCustomers,
  loading,
  searchInput,
  onSearchInputChange,
  onSearch,
  onRefresh,
  onOpenCustomer,
  onAddCustomer,
  canAddCustomer = false,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectedCustomerId,
}: {
  customers: CustomerRow[];
  paginatedCustomers: CustomerRow[];
  loading: boolean;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onOpenCustomer: (customer: CustomerRow) => void;
  onAddCustomer: () => void;
  canAddCustomer?: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  selectedCustomerId?: string;
}) {
  const [sortBy, setSortBy] = useState<CustomerSort>("name");

  const sortedCustomers = useMemo(() => {
    const list = [...paginatedCustomers];
    if (sortBy === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return list;
  }, [paginatedCustomers, sortBy]);

  return (
    <div className="flex h-full min-h-[min(70vh,640px)] flex-col">
      <div className="shrink-0 border-b border-gray-200 p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              placeholder="Search name or email…"
              className="pl-8 pr-8 h-9 text-sm"
              aria-label="Search customers"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  onSearchInputChange("");
                  onRefresh();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {canAddCustomer ? (
            <Button type="button" size="sm" className="h-9 shrink-0 bg-purple-600 hover:bg-purple-700" onClick={onAddCustomer}>
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSortBy("name")}
            className={cn(
              "flex-1 rounded-md py-1.5 font-medium transition-colors",
              sortBy === "name" ? "bg-purple-100 text-purple-800" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Name
          </button>
          <button
            type="button"
            onClick={() => setSortBy("recent")}
            className={cn(
              "flex-1 rounded-md py-1.5 font-medium transition-colors",
              sortBy === "recent" ? "bg-purple-100 text-purple-800" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Recent
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="p-3">
            <ListSkeleton rows={8} />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4">
            <AdminEmptyState
              title={searchInput ? "No matches" : "No customers yet"}
              description={searchInput ? "Try a different search" : "Customers appear after their first booking"}
            />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sortedCustomers.map((c) => {
              const selected = selectedCustomerId === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onOpenCustomer(c)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50",
                      selected && "bg-purple-50 hover:bg-purple-50 border-l-4 border-l-purple-600 pl-[calc(0.75rem-4px)]"
                    )}
                  >
                    {c.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.profilePictureUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold text-sm shrink-0">
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate text-sm" title={c.name}>
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate" title={c.email}>
                        {c.email}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                    </div>
                    {(c.role === "admin" || c.role === "manager") && (
                      <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">
                        {c.role}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {customers.length > 0 ? (
        <div className="shrink-0 border-t border-gray-200 p-2">
          <Pagination
            currentPage={currentPage}
            totalItems={customers.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={[12, 24, 48, 96]}
          />
        </div>
      ) : null}
    </div>
  );
}
