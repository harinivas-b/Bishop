"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

// ── BISHOP Chart Colors ──
const CHART_COLORS = {
  mint: "rgba(34, 197, 96, 1)",
  mintLight: "rgba(34, 197, 96, 0.1)",
  blue: "rgba(59, 130, 246, 1)",
  blueLight: "rgba(59, 130, 246, 0.1)",
  amber: "rgba(245, 158, 11, 1)",
  amberLight: "rgba(245, 158, 11, 0.1)",
  purple: "rgba(168, 85, 247, 1)",
  red: "rgba(239, 68, 68, 1)",
  slate: "rgba(100, 116, 139, 1)",
  slateLight: "rgba(100, 116, 139, 0.1)",
};

// ── Base chart options for consistent styling ──
const baseOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      titleFont: { size: 13, weight: "bold" },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 10,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: "#94a3b8",
        font: { size: 11 },
        maxTicksLimit: 8,
      },
      border: { display: false },
    },
    y: {
      grid: { color: "rgba(226, 232, 240, 0.5)" },
      ticks: {
        color: "#94a3b8",
        font: { size: 11 },
        maxTicksLimit: 6,
      },
      border: { display: false },
      beginAtZero: true,
    },
  },
};

// ─────────────────────────────────────────
// Revenue Line Chart
// ─────────────────────────────────────────
interface RevenueChartProps {
  labels: string[];
  data: number[];
  title?: string;
  className?: string;
}

export function RevenueChart({
  labels,
  data,
  title = "Revenue Trend",
  className,
}: RevenueChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        label: "Revenue",
        data,
        borderColor: CHART_COLORS.mint,
        backgroundColor: CHART_COLORS.mintLight,
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: CHART_COLORS.mint,
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        ...baseOptions.plugins?.tooltip,
        callbacks: {
          label: (ctx) => {
            const amount = ctx.parsed.y ?? 0;
            return `₹${Number(amount).toLocaleString("en-IN")}`;
          },
        },
      },
    },
  };

  return (
    <Card padding="md" className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <div className="h-[280px]">
        <Line data={chartData} options={options} />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────
// Orders Bar Chart
// ─────────────────────────────────────────
interface OrdersChartProps {
  labels: string[];
  data: number[];
  title?: string;
  className?: string;
}

export function OrdersChart({
  labels,
  data,
  title = "Daily Orders",
  className,
}: OrdersChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        label: "Orders",
        data,
        backgroundColor: CHART_COLORS.blue,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 32,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...(baseOptions.plugins?.tooltip as object),
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} orders`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          maxTicksLimit: 8,
        },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(226, 232, 240, 0.5)" },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          maxTicksLimit: 6,
          stepSize: 1,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <Card padding="md" className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <div className="h-[280px]">
        <Bar data={chartData} options={options} />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────
// Status Doughnut Chart
// ─────────────────────────────────────────
interface StatusChartProps {
  labels: string[];
  data: number[];
  title?: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: CHART_COLORS.amber,
  confirmed: CHART_COLORS.blue,
  preparing: CHART_COLORS.purple,
  ready: CHART_COLORS.mint,
  delivered: "#10b981",
  cancelled: CHART_COLORS.red,
};

export function StatusChart({
  labels,
  data,
  title = "Order Status",
  className,
}: StatusChartProps) {
  const colors = labels.map(
    (l) => statusColors[l.toLowerCase()] || CHART_COLORS.slate
  );

  const chartData = {
    labels: labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#64748b",
          font: { size: 11 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        padding: 10,
        cornerRadius: 8,
      },
    },
  };

  return (
    <Card padding="md" className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <div className="h-[280px] flex items-center justify-center">
        {data.length > 0 ? (
          <Doughnut data={chartData} options={options} />
        ) : (
          <p className="text-sm text-slate-400">No order data yet</p>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────
// Top Items Horizontal Bar
// ─────────────────────────────────────────
interface TopItemsChartProps {
  items: { name: string; revenue: number }[];
  title?: string;
  className?: string;
}

export function TopItemsChart({
  items,
  title = "Top Selling Items",
  className,
}: TopItemsChartProps) {
  const chartData = {
    labels: items.map((i) =>
      i.name.length > 18 ? i.name.slice(0, 18) + "…" : i.name
    ),
    datasets: [
      {
        label: "Revenue",
        data: items.map((i) => i.revenue),
        backgroundColor: [
          CHART_COLORS.mint,
          CHART_COLORS.blue,
          CHART_COLORS.amber,
          CHART_COLORS.purple,
          "#06b6d4",
          "#f97316",
          "#ec4899",
          "#8b5cf6",
        ],
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 24,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...(baseOptions.plugins?.tooltip as object),
        callbacks: {
          label: (ctx) => {
            const amount = ctx.parsed.x ?? 0;
            return `₹${Number(amount).toLocaleString("en-IN")}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(226, 232, 240, 0.5)" },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          callback: (v) => `₹${Number(v).toLocaleString("en-IN")}`,
        },
        border: { display: false },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#334155",
          font: { size: 11, weight: "bold" },
        },
        border: { display: false },
      },
    },
  };

  return (
    <Card padding="md" className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <div className="h-[280px]">
        {items.length > 0 ? (
          <Bar data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-400">No item data yet</p>
          </div>
        )}
      </div>
    </Card>
  );
}
