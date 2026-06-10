"use client";

import React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Wallet,
  Receipt,
  Wrench,
  Download,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate, getLocalYmd } from "@/lib/utils/date-helpers";
import {
  SectionHeader,
  fmtCurrency,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORIES,
} from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function ExpensesTab(props: FinancesTabProps) {
  const {
    expenses,
    expenseCategoryData,
    allExpenses,
    maintenanceCosts,
    financingCosts,
    ticketCosts,
    filteredExpenses,
    vehicleMap,
    vehicles,
    addingExpense,
    setAddingExpense,
    newExpense,
    setNewExpense,
    editingExpense,
    setEditingExpense,
    deleteConfirm,
    setDeleteConfirm,
    savingExpenseId,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleExportExpensesCSV,
    setSelectedVehicleId,
  } = props;

  return (
          <div className="space-y-6">
            {/* Category Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {expenseCategoryData.map((cat) => (
                <div
                  key={cat.key}
                  className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all admin-card-press"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.key] || "#6B7280" }}
                    >
                      {CATEGORY_ICONS[cat.key] || <MoreHorizontal className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium text-gray-600 capitalize">{cat.name}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{fmtCurrency(cat.value)}</p>
                  {cat.key === "financing" && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      ${Math.round(cat.value / Math.max(1, new Set(financingCosts.map((f) => f.vehicle_id)).size)).toLocaleString()}/vehicle avg
                    </p>
                  )}
                  {cat.key === "maintenance" && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {maintenanceCosts.length} completed records
                    </p>
                  )}
                </div>
              ))}
              <div className="page-hero-card p-4 text-white">
                <p className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">Total Expenses</p>
                <p className="text-xl font-bold">{fmtCurrency(allExpenses.reduce((s, e) => s + (e.amount ?? 0), 0))}</p>
                <p className="text-xs text-gray-400 mt-0.5">{allExpenses.length} total entries</p>
              </div>
            </div>

            {/* Add Expense */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader title="Expenses" subtitle={`${expenses.length} manual + ${maintenanceCosts.length} maintenance + ${financingCosts.length} financing`} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportExpensesCSV}>
                      <Download className="h-4 w-4 mr-1" /> Export CSV
                    </Button>
                    <Button
                      onClick={() => {
                        if (addingExpense) {
                          setNewExpense({
                            vehicleId: "",
                            blockedDateId: "",
                            category: "maintenance",
                            amount: "",
                            description: "",
                            date: getLocalYmd(new Date()),
                          });
                        }
                        setAddingExpense(!addingExpense);
                      }}
                      size="sm"
                      className={addingExpense ? "bg-gray-600" : ""}
                    >
                      {addingExpense ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      {addingExpense ? "Cancel" : "Add Expense"}
                    </Button>
                  </div>
                </div>

                {addingExpense && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                    {newExpense.blockedDateId ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs text-teal-900">
                        <span>This expense will be linked to the selected Turo trip.</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] border-teal-300"
                          onClick={() => setNewExpense((p) => ({ ...p, blockedDateId: "" }))}
                        >
                          Unlink trip
                        </Button>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Category <span className="text-red-500">*</span></label>
                        <Select
                          value={newExpense.category}
                          onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Amount <span className="text-red-500">*</span></label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                          className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Date <span className="text-red-500">*</span></label>
                        <DatePicker
                          value={newExpense.date}
                          onChange={(val) => setNewExpense((p) => ({ ...p, date: val }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Vehicle (optional)</label>
                        <Select
                          value={newExpense.vehicleId}
                          onChange={(e) => setNewExpense((p) => ({ ...p, vehicleId: e.target.value }))}
                        >
                          <option value="">General (no vehicle)</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Description (optional)</label>
                      <Input
                        placeholder="e.g. Oil change, monthly premium..."
                        value={newExpense.description}
                        onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                        className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <Button onClick={handleAddExpense} disabled={savingExpenseId === "new"} className="w-full sm:w-auto">
                      {savingExpenseId === "new" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Save Expense
                    </Button>
                  </div>
                )}

                {/* Financing Payments (auto-generated from financed vehicles) */}
                {financingCosts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Financing Payments</p>
                    <div className="space-y-2">
                      {financingCosts
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 12) // Show last 12 payments max
                        .map((fc) => {
                          const vehicle = fc.vehicle_id ? vehicleMap.get(fc.vehicle_id) : undefined;
                          return (
                            <div
                              key={fc.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                              onClick={() => fc.vehicle_id && setSelectedVehicleId(fc.vehicle_id)}
                            >
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-purple-600">
                                <Wallet className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{fc.description}</p>
                                  {vehicle && (
                                    <Badge variant="secondary" className="text-xs">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-purple-600">Monthly financing payment</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">${fc.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{formatDate(fc.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      {financingCosts.length > 12 && (
                        <p className="text-xs text-gray-500 text-center py-1">
                          + {financingCosts.length - 12} more payments
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Maintenance Costs (auto-synced from maintenance module) */}
                {maintenanceCosts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From Maintenance Records</p>
                    <div className="space-y-2">
                      {maintenanceCosts
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((mc) => {
                          const vehicle = mc.vehicle_id ? vehicleMap.get(mc.vehicle_id) : undefined;
                          return (
                            <div key={mc.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-amber-500">
                                <Wrench className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{mc.description}</p>
                                  {vehicle && (
                                    <Badge variant="secondary" className="text-xs">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-amber-600">Auto-synced from Maintenance</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">${mc.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{formatDate(mc.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Tickets (traffic violations) */}
                {ticketCosts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Traffic Tickets</p>
                    <div className="space-y-2">
                      {ticketCosts
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((ticket) => {
                          const vehicle = ticket.vehicle_id ? vehicleMap.get(ticket.vehicle_id) : undefined;
                          return (
                            <div
                              key={ticket.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100"
                            >
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-orange-500">
                                <Receipt className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{ticket.description}</p>
                                  {vehicle && (
                                    <Badge variant="secondary" className="text-xs">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-orange-600">Traffic violation</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">${ticket.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{formatDate(ticket.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Manual Expenses List */}
                {filteredExpenses.length > 0 && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manual Expenses</p>
                )}
                {filteredExpenses.length === 0 && maintenanceCosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Receipt className="h-8 w-8 mb-2" />
                    <p className="text-sm">No expenses recorded in this date range</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExpenses
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((exp) => {
                        const vehicle = exp.vehicle_id ? vehicleMap.get(exp.vehicle_id) : undefined;
                        const isEditing = editingExpense?.id === exp.id;
                        const isDeleting = deleteConfirm === exp.id;

                        if (isEditing && editingExpense) {
                          return (
                            <div key={exp.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Category <span className="text-red-500">*</span></label>
                                  <Select
                                    value={editingExpense.category}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, category: e.target.value } : p)}
                                  >
                                    {CATEGORIES.map((c) => (
                                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                    ))}
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Amount <span className="text-red-500">*</span></label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingExpense.amount}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, amount: e.target.value } : p)}
                                    className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Date <span className="text-red-500">*</span></label>
                                  <DatePicker
                                    value={editingExpense.date}
                                    onChange={(val) => setEditingExpense((p) => p ? { ...p, date: val } : p)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Vehicle</label>
                                  <Select
                                    value={editingExpense.vehicle_id || ""}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, vehicle_id: e.target.value || null } : p)}
                                  >
                                    <option value="">General</option>
                                    {vehicles.map((v) => (
                                      <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                                    ))}
                                  </Select>
                                </div>
                              </div>
                              <Input
                                placeholder="Description"
                                value={editingExpense.description}
                                onChange={(e) => setEditingExpense((p) => p ? { ...p, description: e.target.value } : p)}
                                className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                              {editingExpense.blocked_date_id ? (
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-teal-800">
                                  <span>Linked to a Turo trip (vehicle must match the trip).</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px]"
                                    onClick={() => setEditingExpense((p) => (p ? { ...p, blocked_date_id: null } : p))}
                                  >
                                    Unlink trip
                                  </Button>
                                </div>
                              ) : null}
                              <div className="flex gap-2">
                                <Button onClick={handleUpdateExpense} size="sm" disabled={savingExpenseId === editingExpense?.id}>
                                  {savingExpenseId === editingExpense?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Save
                                </Button>
                                <Button onClick={() => setEditingExpense(null)} variant="outline" size="sm">Cancel</Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group admin-card-press">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[exp.category] || "#6B7280" }}
                            >
                              {CATEGORY_ICONS[exp.category] || <MoreHorizontal className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium capitalize">{exp.category}</p>
                                {vehicle && (
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </Badge>
                                )}
                                {exp.blocked_date_id && (
                                  <Badge variant="outline" className="text-[10px] text-teal-700 border-teal-200">
                                    Turo trip
                                  </Badge>
                                )}
                              </div>
                              {exp.description && <p className="text-xs text-gray-500 truncate">{exp.description}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">${exp.amount.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{formatDate(exp.date)}</p>
                            </div>
                            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() =>
                                  setEditingExpense({
                                    id: exp.id,
                                    category: exp.category,
                                    amount: String(exp.amount),
                                    description: exp.description || "",
                                    date: exp.date,
                                    vehicle_id: exp.vehicle_id,
                                    blocked_date_id: exp.blocked_date_id ?? null,
                                  })
                                }
                                aria-label="Edit expense"
                                className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {isDeleting ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    disabled={savingExpenseId === exp.id}
                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    aria-label="Confirm delete"
                                  >
                                    {savingExpenseId === exp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={savingExpenseId === exp.id}
                                    className="px-2 py-1 text-xs bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    aria-label="Cancel delete"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(exp.id)}
                                  aria-label="Delete expense"
                                  className="p-1.5 rounded-md hover:bg-red-100 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
  );
}

export default ExpensesTab;
