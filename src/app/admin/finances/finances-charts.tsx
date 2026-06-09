"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface CashFlowPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function FinancesOverviewCharts({ data }: { data: CashFlowPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-gray-500 text-center py-8">No cash-flow data for this range.</p>;
  }

  return (
    <div className="h-52 sm:h-64 lg:h-72">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#fca5a5" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="profit" name="Profit" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
