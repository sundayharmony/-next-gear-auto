"use client";

import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import { DashboardSkeleton, ListSkeleton } from "@/components/admin/skeleton";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { useFinancesData } from "./use-finances-data";
import { useFinancesComputed } from "./use-finances-computed";
import {
  exportExpensesCsv,
  getVehicleDetail,
  useFinancesMutations,
} from "./use-finances-mutations";
import { FinancesDailyRevenueView } from "./finances-daily-revenue-view";
import { FinancesVehicleDetail } from "./finances-vehicle-detail";
import type { FinancesTabId, FinancesTabProps } from "./finances-tab-types";

const OverviewTab = dynamic(() => import("./tabs/overview-tab"), {
  loading: () => <TabLoading />,
});
const ExpensesTab = dynamic(() => import("./tabs/expenses-tab"), {
  loading: () => <TabLoading />,
});
const RevenueTab = dynamic(() => import("./tabs/revenue-tab"), {
  loading: () => <TabLoading />,
});
const ProfitTab = dynamic(() => import("./tabs/profit-tab"), {
  loading: () => <TabLoading />,
});
const VehiclesTab = dynamic(() => import("./tabs/vehicles-tab"), {
  loading: () => <TabLoading />,
});

const FINANCE_TABS: FinancesTabId[] = ["overview", "expenses", "revenue", "profit", "vehicles"];

function TabLoading() {
  return <ListSkeleton rows={5} />;
}

export default function AdminFinancesPage() {
  const {
    bookings,
    blockedDates,
    expenses,
    vehicles,
    maintenance,
    tickets,
    loading,
    error,
    setError,
    fetchData,
    dateRange,
    setDateRange,
    draftDateRange,
    setDraftDateRange,
    draftDirty,
    defaultDateRange,
  } = useFinancesData();
  const { success, setSuccess } = useAutoToast();
  const [activeTab, setActiveTab] = useState<FinancesTabId>("overview");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showDailyRevenue, setShowDailyRevenue] = useState(false);

  const computed = useFinancesComputed({
    bookings,
    blockedDates,
    expenses,
    vehicles,
    maintenance,
    tickets,
    dateRange,
  });

  const mutations = useFinancesMutations({ setError, setSuccess });

  const handleExportExpensesCSV = useCallback(() => {
    exportExpensesCsv(computed.allExpenses, computed.vehicleMap);
  }, [computed.allExpenses, computed.vehicleMap]);

  const selectedVehicleDetail = useMemo(() => {
    if (!selectedVehicleId) return null;
    return getVehicleDetail(
      selectedVehicleId,
      vehicles,
      computed.revenueBookings,
      computed.allExpenses,
      dateRange
    );
  }, [selectedVehicleId, vehicles, computed.revenueBookings, computed.allExpenses, dateRange]);

  const tabProps: FinancesTabProps = {
    dateRange,
    vehicles,
    expenses,
    ...computed,
    setActiveTab,
    setSelectedVehicleId,
    setShowDailyRevenue,
    ...mutations,
    handleExportExpensesCSV,
  };

  if (showDailyRevenue) {
    return (
      <FinancesDailyRevenueView
        allTimeDailyRevenue={computed.allTimeDailyRevenue}
        onBack={() => setShowDailyRevenue(false)}
      />
    );
  }

  if (selectedVehicleDetail) {
    return (
      <FinancesVehicleDetail
        detail={selectedVehicleDetail}
        dateRange={dateRange}
        onBack={() => setSelectedVehicleId(null)}
      />
    );
  }

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Finances" subtitle="Track revenue, expenses, and profitability" />
        <AdminPageBody>
          <DashboardSkeleton />
        </AdminPageBody>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Finances"
        subtitle="Track revenue, expenses, and profitability"
        actions={
          <Button
            onClick={() => void fetchData()}
            variant="outline"
            size="sm"
            className="page-hero-btn-outline hidden sm:inline-flex"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Range</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0 hidden sm:block" />
                  <DatePicker
                    value={draftDateRange.from}
                    onChange={(newFrom) => {
                      setDraftDateRange((p) => {
                        const newTo = newFrom > p.to ? newFrom : p.to;
                        return { from: newFrom, to: newTo };
                      });
                    }}
                    placeholder="Start date"
                  />
                  <span className="text-gray-400 font-medium shrink-0">—</span>
                  <DatePicker
                    value={draftDateRange.to}
                    onChange={(newTo) => {
                      setDraftDateRange((p) => {
                        const newFrom = newTo < p.from ? newTo : p.from;
                        return { from: newFrom, to: newTo };
                      });
                    }}
                    placeholder="End date"
                  />
                </div>
                {draftDirty && (
                  <button
                    onClick={() => setDateRange({ ...draftDateRange })}
                    className="px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shrink-0 w-full sm:w-auto"
                  >
                    Apply
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setDraftDateRange(defaultDateRange);
                  setDateRange(defaultDateRange);
                }}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors self-start"
              >
                Reset YTD
              </button>
            </div>
          </div>
          <div className="w-full lg:overflow-visible overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 w-full lg:w-auto" role="tablist">
              {FINANCE_TABS.map((tab, idx) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" && idx > 0) {
                      e.preventDefault();
                      setActiveTab(FINANCE_TABS[idx - 1]);
                      const sibling = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement;
                      sibling?.focus();
                    } else if (e.key === "ArrowRight" && idx < FINANCE_TABS.length - 1) {
                      e.preventDefault();
                      setActiveTab(FINANCE_TABS[idx + 1]);
                      const sibling = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                      sibling?.focus();
                    }
                  }}
                  className={`px-4 py-2 sm:px-4 sm:py-1.5 text-sm rounded-md transition-colors capitalize whitespace-nowrap focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 ${
                    activeTab === tab
                      ? "bg-white text-gray-900 font-semibold shadow-sm"
                      : "text-gray-500 hover:text-gray-900 active:bg-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AdminPageBody>
        {success && <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess("")} />}
        {error && <AdminStatusBanner type="error" message={error} onDismiss={() => setError("")} />}

        {activeTab === "overview" && <OverviewTab {...tabProps} />}
        {activeTab === "expenses" && <ExpensesTab {...tabProps} />}
        {activeTab === "revenue" && <RevenueTab {...tabProps} />}
        {activeTab === "profit" && <ProfitTab {...tabProps} />}
        {activeTab === "vehicles" && <VehiclesTab {...tabProps} />}
      </AdminPageBody>
    </>
  );
}
