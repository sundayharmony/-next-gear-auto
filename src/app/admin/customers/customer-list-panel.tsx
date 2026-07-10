"use client";

import { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  ChevronRight,
  X,
  Calendar,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminPageBody } from "@/components/admin/admin-shell";
import { AdminEmptyState } from "@/components/admin/ui-feedback";
import { ListSkeleton } from "@/components/admin/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils/date-helpers";
import type { CustomerRow } from "./use-customers-data";

interface CustomerListPanelProps {
  customers: CustomerRow[];
  paginatedCustomers: CustomerRow[];
  loading: boolean;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onOpenCustomer: (customer: CustomerRow) => void;
  onDeleteCustomer?: (customer: CustomerRow) => void;
  canDeleteCustomers?: boolean;
  onAddCustomer: () => void;
  canAddCustomer?: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  selectedCustomerId?: string;
}

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
  onDeleteCustomer,
  canDeleteCustomers = false,
  onAddCustomer,
  canAddCustomer = false,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectedCustomerId,
}: CustomerListPanelProps) {
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
    <AdminPageBody>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search by name or email..."
            className="pl-9 pr-9"
            aria-label="Search customers by name or email"
          />
          {searchInput && (
            <button
              onClick={() => { onSearchInputChange(""); onRefresh(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={onSearch} variant="outline">Search</Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        {canAddCustomer ? (
          <Button onClick={onAddCustomer} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        ) : null}
      </div>

      <div className="hidden lg:flex items-center gap-2 mb-4 text-xs text-gray-500">
        <span className="font-medium">Sort:</span>
        <button
          type="button"
          onClick={() => setSortBy("name")}
          className={`px-2 py-1 rounded-full ${sortBy === "name" ? "bg-purple-100 text-purple-700 font-medium" : "bg-gray-100"}`}
        >
          Name
        </button>
        <button
          type="button"
          onClick={() => setSortBy("recent")}
          className={`px-2 py-1 rounded-full ${sortBy === "recent" ? "bg-purple-100 text-purple-700 font-medium" : "bg-gray-100"}`}
        >
          Recent booking
        </button>
      </div>

      {loading ? (
        <ListSkeleton rows={6} />
      ) : customers.length === 0 ? (
        <AdminEmptyState
          title={searchInput ? "No customers match your search" : "No customers yet"}
          description={searchInput ? "Try a different name or email" : "Customers will appear here after their first booking"}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-3">
            {sortedCustomers.map((c) => (
              <Card
                key={c.id}
                className={`rounded-xl border shadow-sm hover:border-purple-300 hover:shadow-md transition-all ${
                  selectedCustomerId === c.id ? "border-purple-400 ring-1 ring-purple-200 bg-purple-50/40" : "border-gray-200/80"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => onOpenCustomer(c)}
                    >
                      {c.profilePictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.profilePictureUrl}
                          alt={c.name}
                          className="h-10 w-10 rounded-full object-cover border border-purple-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex-shrink-0">
                          {c.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate" title={c.name}>{c.name}</p>
                        <p className="text-xs text-gray-500 truncate" title={c.email}>{c.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {canDeleteCustomers && onDeleteCustomer ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomer(c);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                          aria-label={`Delete customer ${c.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 cursor-pointer"
                    onClick={() => onOpenCustomer(c)}
                  >
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span className="font-semibold text-black">{formatDate(c.createdAt)}</span>
                    </div>
                    {c.phone && (
                      <span className="text-xs text-gray-400">{c.phone}</span>
                    )}
                    {(c.role === "admin" || c.role === "manager") && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">{c.role === "admin" ? "Admin" : "Manager"}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={customers.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={[12, 24, 48, 96]}
          />
        </>
      )}
    </AdminPageBody>
  );
}
