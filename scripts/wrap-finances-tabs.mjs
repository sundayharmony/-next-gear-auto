import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tabsDir = path.join(root, "src/app/admin/finances/tabs");

const tabMeta = {
  "overview-tab.tsx": {
    name: "OverviewTab",
    imports: `"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Car,
  Target,
  Receipt,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";
import {
  StatCard,
  SectionHeader,
  fmtCurrency,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function OverviewTab({
  summaryData,
  cashFlowData,
  dailyEarningsData,
  expenseCategoryData,
  vehicleAnalytics,
  vehicles,
  setActiveTab,
  setSelectedVehicleId,
  setShowDailyRevenue,
}: FinancesTabProps) {
  return (`,
    footer: `  );
}

export default OverviewTab;
`,
  },
  "expenses-tab.tsx": {
    name: "ExpensesTab",
    imports: `"use client";

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
import { formatDate } from "@/lib/utils/date-helpers";
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

  return (`,
    footer: `  );
}

export default ExpensesTab;
`,
  },
  "revenue-tab.tsx": {
    name: "RevenueTab",
    imports: `"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Car,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatDate } from "@/lib/utils/date-helpers";
import { getVehicleDisplayName } from "@/lib/types";
import { StatCard, SectionHeader, fmtCurrency } from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function RevenueTab(props: FinancesTabProps) {
  const {
    summaryData,
    revenueByMonth,
    turoRevenueEntries,
    revenueBookings,
    tripExpenseTotalsByBlockedId,
    vehicleMap,
    setActiveTab,
    setAddingExpense,
    setNewExpense,
    setSelectedVehicleId,
  } = props;

  return (`,
    footer: `  );
}

export default RevenueTab;
`,
  },
  "profit-tab.tsx": {
    name: "ProfitTab",
    imports: `"use client";

import React from "react";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line,
  Legend,
} from "recharts";
import { StatCard, SectionHeader, fmtCurrency } from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function ProfitTab({ summaryData, monthlyProfitData }: FinancesTabProps) {
  return (`,
    footer: `  );
}

export default ProfitTab;
`,
  },
  "vehicles-tab.tsx": {
    name: "VehiclesTab",
    imports: `"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function VehiclesTab({ vehicleAnalytics, setSelectedVehicleId }: FinancesTabProps) {
  return (`,
    footer: `  );
}

export default VehiclesTab;
`,
  },
};

for (const [file, meta] of Object.entries(tabMeta)) {
  const bodyPath = path.join(tabsDir, file);
  let body = fs.readFileSync(bodyPath, "utf8").trimEnd();
  if (body.endsWith(")}")) body = body.slice(0, -1);
  if (body.endsWith(")")) body = body.slice(0, -1);
  fs.writeFileSync(bodyPath, `${meta.imports}\n${body}\n${meta.footer}`);
  console.log("wrapped", file);
}

console.log("done");
