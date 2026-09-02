"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  RevenueChart,
  OrdersChart,
  StatusChart,
  TopItemsChart,
} from "@/components/charts/charts";
import { formatCurrency } from "@/lib/utils";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";
import { useLanguageStore } from "@/stores/language-store";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Percent,
  Calendar,
  ArrowUpRight,
  Package,
} from "lucide-react";

type TimePeriod = "7d" | "30d" | "90d" | "all";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  dailyData: { date: string; revenue: number; orders: number }[];
  statusData: { status: string; count: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  paymentBreakdown: { method: string; count: number; total: number }[];
  peakHours: { hour: number; orders: number }[];
}

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const PERIOD_LABELS: Record<string, Record<TimePeriod, string>> = {
  en: {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    all: "All Time",
  },
  ta: {
    "7d": "கடந்த 7 நாட்கள்",
    "30d": "கடந்த 30 நாட்கள்",
    "90d": "கடந்த 90 நாட்கள்",
    all: "எல்லா நேரமும்",
  },
};

export default function AnalyticsPage() {
  const { shop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].analyticsPage;
  const currentPeriodLabels = PERIOD_LABELS[lang || "en"] || PERIOD_LABELS.en;
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!shop) return;
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Determine date range
      const daysMap: Record<TimePeriod, number | null> = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        all: null,
      };
      const days = daysMap[period];
      const startDate = days ? getDaysAgo(days) : null;

      // Build query for orders
      let ordersQuery = supabase
        .from("orders")
        .select("id, total, status, payment_method, created_at")
        .eq("shop_id", shop.id)
        .neq("status", "cancelled");

      if (startDate) {
        ordersQuery = ordersQuery.gte("created_at", startDate);
      }

      // Build query for all orders (including cancelled) for status chart
      let allOrdersQuery = supabase
        .from("orders")
        .select("status")
        .eq("shop_id", shop.id);

      if (startDate) {
        allOrdersQuery = allOrdersQuery.gte("created_at", startDate);
      }

      // Inventory costs
      const inventoryQuery = supabase
        .from("inventory")
        .select("quantity, cost_per_unit")
        .eq("shop_id", shop.id);

      const [ordersRes, allOrdersRes, inventoryRes] = await Promise.all([
        ordersQuery.order("created_at", { ascending: true }),
        allOrdersQuery,
        inventoryQuery,
      ]);

      const orders = ordersRes.data || [];
      const allOrders = allOrdersRes.data || [];
      const inventoryItems = inventoryRes.data || [];

      // Fetch order items strictly scoped to this shop's order IDs
      const orderIds = orders.map((o) => o.id);
      let orderItems: { name: string; quantity: number; total: number }[] = [];
      if (orderIds.length > 0) {
        const { data: itemData } = await supabase
          .from("order_items")
          .select("name, quantity, total")
          .in("order_id", orderIds)
          .limit(1000);
        orderItems = itemData || [];
      }

      // ── Compute Metrics ──
      const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Total inventory cost (approximation of COGS)
      const totalCost = inventoryItems.reduce(
        (s, i) => s + (i.quantity || 0) * (i.cost_per_unit || 0),
        0
      );
      const grossProfit = totalRevenue - totalCost;
      const profitMargin =
        totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // ── Daily Data ──
      const numDays = days || 365;
      const dailyMap = new Map<
        string,
        { revenue: number; orders: number }
      >();
      for (let i = Math.min(numDays, 365) - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap.set(key, { revenue: 0, orders: 0 });
      }
      orders.forEach((order) => {
        const key = new Date(order.created_at).toISOString().slice(0, 10);
        const entry = dailyMap.get(key);
        if (entry) {
          entry.revenue += order.total || 0;
          entry.orders += 1;
        }
      });
      const dailyData = Array.from(dailyMap.entries()).map(([date, d]) => ({
        date,
        revenue: d.revenue,
        orders: d.orders,
      }));

      // ── Status Breakdown ──
      const statusMap = new Map<string, number>();
      allOrders.forEach((o) => {
        statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
      });
      const statusData = Array.from(statusMap.entries()).map(
        ([status, count]) => ({ status, count })
      );

      // ── Top Items ──
      const itemMap = new Map<
        string,
        { quantity: number; revenue: number }
      >();
      orderItems.forEach((item) => {
        const ex = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
        ex.quantity += item.quantity;
        ex.revenue += item.total;
        itemMap.set(item.name, ex);
      });
      const topItems = Array.from(itemMap.entries())
        .map(([name, d]) => ({ name, ...d }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // ── Payment Breakdown ──
      const paymentMap = new Map<string, { count: number; total: number }>();
      orders.forEach((o) => {
        const method = o.payment_method || "other";
        const ex = paymentMap.get(method) || { count: 0, total: 0 };
        ex.count += 1;
        ex.total += o.total || 0;
        paymentMap.set(method, ex);
      });
      const paymentBreakdown = Array.from(paymentMap.entries())
        .map(([method, d]) => ({ method, ...d }))
        .sort((a, b) => b.total - a.total);

      // ── Peak Hours ──
      const hourMap = new Map<number, number>();
      for (let h = 0; h < 24; h++) hourMap.set(h, 0);
      orders.forEach((o) => {
        const h = new Date(o.created_at).getHours();
        hourMap.set(h, (hourMap.get(h) || 0) + 1);
      });
      const peakHours = Array.from(hourMap.entries())
        .map(([hour, count]) => ({ hour, orders: count }))
        .sort((a, b) => a.hour - b.hour);

      setData({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalCost,
        grossProfit,
        profitMargin,
        dailyData,
        statusData,
        topItems,
        paymentBreakdown,
        peakHours,
      });
    } catch (error) {
      console.error("Analytics fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [shop, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const chartLabels =
    data?.dailyData.map((d) => {
      const dt = new Date(d.date);
      return period === "7d"
        ? dt.toLocaleDateString("en-IN", { weekday: "short" })
        : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    }) || [];

  const peakHourLabels =
    data?.peakHours.map((h) => {
      const ampm = h.hour >= 12 ? "PM" : "AM";
      const hr = h.hour % 12 || 12;
      return `${hr}${ampm}`;
    }) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t.desc}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(Object.keys(currentPeriodLabels) as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                period === p
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {currentPeriodLabels[p]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <StatCard
            label="Total Revenue"
            value={formatCurrency(data?.totalRevenue || 0)}
            icon={TrendingUp}
            iconColor="bg-mint-50 text-mint-600"
            changeLabel={currentPeriodLabels[period]}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard
            label="Total Orders"
            value={data?.totalOrders || 0}
            icon={ShoppingBag}
            iconColor="bg-blue-50 text-blue-600"
            changeLabel={currentPeriodLabels[period]}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <StatCard
            label="Avg Order Value"
            value={formatCurrency(data?.avgOrderValue || 0)}
            icon={DollarSign}
            iconColor="bg-amber-50 text-amber-600"
            changeLabel="Per order average"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            label="Profit Margin"
            value={`${(data?.profitMargin || 0).toFixed(1)}%`}
            icon={Percent}
            iconColor={
              (data?.profitMargin || 0) >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }
            changeLabel={`Gross: ${formatCurrency(data?.grossProfit || 0)}`}
          />
        </motion.div>
      </div>

      {/* Revenue + Orders Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <RevenueChart
          labels={chartLabels}
          data={data?.dailyData.map((d) => d.revenue) || []}
          title={`Revenue — ${currentPeriodLabels[period]}`}
        />
        <OrdersChart
          labels={chartLabels}
          data={data?.dailyData.map((d) => d.orders) || []}
          title={`Orders — ${currentPeriodLabels[period]}`}
        />
      </motion.div>

      {/* Status + Top Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <StatusChart
          labels={data?.statusData.map((s) => s.status) || []}
          data={data?.statusData.map((s) => s.count) || []}
          title="Order Status Breakdown"
        />
        <TopItemsChart
          items={data?.topItems || []}
          title="Top Selling Items"
        />
      </motion.div>

      {/* Profit Summary + Payment Breakdown + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profit Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card padding="md" className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Profit Summary</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Revenue</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(data?.totalRevenue || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Inventory Cost (COGS)
                </span>
                <span className="text-sm font-semibold text-red-600 tabular-nums">
                  −{formatCurrency(data?.totalCost || 0)}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Gross Profit
                  </span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      (data?.grossProfit || 0) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(data?.grossProfit || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 justify-end">
                  <ArrowUpRight
                    className={`h-3.5 w-3.5 ${
                      (data?.profitMargin || 0) >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      (data?.profitMargin || 0) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {(data?.profitMargin || 0).toFixed(1)}% margin
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Payment Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card padding="md" className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Payment Methods</CardTitle>
            </CardHeader>
            {data?.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
              <div className="space-y-3">
                {data.paymentBreakdown.map((p) => {
                  const pct =
                    data.totalOrders > 0
                      ? ((p.count / data.totalOrders) * 100).toFixed(0)
                      : 0;
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize text-slate-600">
                          {p.method}
                        </span>
                        <span className="text-xs text-slate-400">
                          {p.count} orders · {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-mint-400 to-mint-600 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 text-right tabular-nums">
                        {formatCurrency(p.total)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm text-slate-400">No payment data yet</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Peak Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card padding="md" className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Peak Hours</CardTitle>
            </CardHeader>
            {data?.peakHours &&
            data.peakHours.some((h) => h.orders > 0) ? (
              <div className="space-y-1.5">
                {data.peakHours
                  .filter((h) => h.orders > 0)
                  .sort((a, b) => b.orders - a.orders)
                  .slice(0, 8)
                  .map((h) => {
                    const maxOrders = Math.max(
                      ...data.peakHours.map((x) => x.orders)
                    );
                    const pct =
                      maxOrders > 0
                        ? ((h.orders / maxOrders) * 100).toFixed(0)
                        : 0;
                    return (
                      <div key={h.hour} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-10 shrink-0 tabular-nums">
                          {peakHourLabels[h.hour]}
                        </span>
                        <div className="flex-1 h-5 bg-slate-50 rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md bg-blue-100 flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${Math.max(Number(pct), 8)}%` }}
                          >
                            <span className="text-[10px] font-medium text-blue-700">
                              {h.orders}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm text-slate-400">No order data yet</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Monthly Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card padding="md">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <Badge variant="mint" size="md">
              {currentPeriodLabels[period]}
            </Badge>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  {
                    label: "Total Revenue",
                    value: formatCurrency(data?.totalRevenue || 0),
                  },
                  {
                    label: "Total Orders",
                    value: (data?.totalOrders || 0).toString(),
                  },
                  {
                    label: "Average Order Value",
                    value: formatCurrency(data?.avgOrderValue || 0),
                  },
                  {
                    label: "Inventory Cost",
                    value: formatCurrency(data?.totalCost || 0),
                  },
                  {
                    label: "Gross Profit",
                    value: formatCurrency(data?.grossProfit || 0),
                  },
                  {
                    label: "Profit Margin",
                    value: `${(data?.profitMargin || 0).toFixed(1)}%`,
                  },
                  {
                    label: "Top Seller",
                    value: data?.topItems?.[0]?.name || "—",
                  },
                  {
                    label: "Most Used Payment",
                    value: data?.paymentBreakdown?.[0]?.method
                      ? data.paymentBreakdown[0].method.charAt(0).toUpperCase() +
                        data.paymentBreakdown[0].method.slice(1)
                      : "—",
                  },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/50">
                    <td className="py-3 px-2 text-slate-600">{row.label}</td>
                    <td className="py-3 px-2 text-right font-medium text-slate-900 tabular-nums">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
