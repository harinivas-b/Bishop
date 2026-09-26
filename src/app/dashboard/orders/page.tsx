"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  RefreshCw,
  Clock,
  User,
  Phone,
  Utensils,
  CheckCircle,
  Bell,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Order, OrderItem } from "@/lib/types";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";
import { useLanguageStore } from "@/stores/language-store";
import { formatCurrency } from "@/lib/utils";

interface OrderWithItems extends Order {
  order_items?: OrderItem[];
}

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled";

const STATUS_FLOW: Record<string, Order["status"]> = {
  pending: "paid",
  pending_payment: "paid",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  pending: "Confirm Order",
  pending_payment: "Confirm Order",
};

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info" | "mint"> = {
  pending: "warning",
  pending_payment: "warning",
  paid: "mint",
  confirmed: "mint",
  cancelled: "danger",
};

function formatOrderAge(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ago`;
}

export default function OrdersPage() {
  const { shop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].ordersPage;
  const tc = DASHBOARD_TRANSLATIONS[lang || "en"].common;

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [activeOrder, setActiveOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!shop) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as OrderWithItems[]) || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchOrders();

    // 1-minute periodic polling fallback to guarantee live updates
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 60000);

    return () => clearInterval(pollInterval);
  }, [fetchOrders]);

  // Supabase Realtime Subscription setup
  useEffect(() => {
    if (!shop) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`realtime_orders_${shop.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shop.id}`,
        },
        async (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            const { data: items } = await supabase
              .from("order_items")
              .select("*")
              .eq("order_id", newOrder.id);

            setOrders((prev) => {
              if (prev.some((o) => o.id === newOrder.id)) return prev;
              return [{ ...newOrder, order_items: items || [] }, ...prev];
            });

            toast.success(`🔔 New Order #${newOrder.order_number} (${newOrder.customer_name || newOrder.table_number || "Takeaway"})`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setOrders((prev) => prev.filter((o) => o.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop]);

  async function updateStatus(order: OrderWithItems, targetStatus?: Order["status"]) {
    const nextStatus = targetStatus || STATUS_FLOW[order.status] || "paid";

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .update({ status: nextStatus, payment_status: "paid" })
        .eq("id", order.id)
        .select();

      if (error) {
        console.error("Update order status failed:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status: nextStatus, payment_status: "paid" } : item
        )
      );
      toast.success(`Order #${order.order_number} confirmed!`);
    } catch (error: any) {
      console.error("Update order status failed:", {
        message: error?.message || (typeof error === "object" ? JSON.stringify(error) : String(error)),
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      const errMsg = error?.message || error?.details || "Failed to update order status";
      toast.error(`Update order status failed: ${errMsg}`);
    }
  }

  async function togglePaymentStatus(order: OrderWithItems) {
    const nextPaymentStatus = order.payment_status === "paid" ? "pending" : "paid";
    const nextStatus = nextPaymentStatus === "paid" ? "paid" : (order.status === "paid" ? "pending_payment" : order.status);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .update({ payment_status: nextPaymentStatus, status: nextStatus })
        .eq("id", order.id)
        .select();

      if (error) {
        console.error("Update payment status failed:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, payment_status: nextPaymentStatus, status: nextStatus } : item
        )
      );
      toast.success(
        nextPaymentStatus === "paid"
          ? `Order #${order.order_number} marked as Paid & Confirmed!`
          : `Order #${order.order_number} marked as Pending.`
      );
    } catch (error: any) {
      console.error("Update payment status failed:", {
        message: error?.message || (typeof error === "object" ? JSON.stringify(error) : String(error)),
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      const errMsg = error?.message || error?.details || "Failed to update payment status";
      toast.error(`Update payment status failed: ${errMsg}`);
    }
  }

  async function markRemainingPaid(order: OrderWithItems) {
    try {
      const supabase = createClient();
      const orderTotal = order.total ?? order.grand_total ?? 0;
      const { data, error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "paid",
          remaining_amount: 0,
          advance_amount: orderTotal,
        })
        .eq("id", order.id)
        .select();

      if (error) {
        console.error("Mark remaining paid failed:", error);
        throw error;
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                payment_status: "paid",
                status: "paid",
                remaining_amount: 0,
                advance_amount: orderTotal,
              }
            : item
        )
      );
      toast.success(`Order #${order.order_number} remaining balance marked as paid!`);
    } catch (error: any) {
      console.error("Mark remaining paid failed:", error);
      const errMsg = error?.message || error?.details || "Failed to update remaining balance";
      toast.error(`Mark remaining paid failed: ${errMsg}`);
    }
  }

  async function cancelOrder(order: OrderWithItems) {
    if (!confirm(`Cancel order #${order.order_number}?`)) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id)
        .select();

      if (error) {
        console.error("Cancel order failed:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status: "cancelled" } : item
        )
      );
      toast.success("Order cancelled");
    } catch (error: any) {
      console.error("Cancel order failed:", {
        message: error?.message || (typeof error === "object" ? JSON.stringify(error) : String(error)),
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      const errMsg = error?.message || error?.details || "Failed to cancel order";
      toast.error(`Cancel order failed: ${errMsg}`);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") {
      return (o.status === "pending" || o.status === "pending_payment") && o.payment_status !== "paid";
    }
    if (statusFilter === "confirmed") {
      return (o.status === "confirmed" || o.status === "paid" || o.payment_status === "paid") && o.status !== "cancelled";
    }
    if (statusFilter === "cancelled") {
      return o.status === "cancelled";
    }
    return true;
  });

  const filterTabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: "all", label: t.statusAll || "All", count: orders.length },
    {
      id: "pending",
      label: t.statusPending || "Pending",
      count: orders.filter((o) => (o.status === "pending" || o.status === "pending_payment") && o.payment_status !== "paid").length,
    },
    {
      id: "confirmed",
      label: t.statusConfirmed || "Confirmed",
      count: orders.filter((o) => (o.status === "confirmed" || o.status === "paid" || o.payment_status === "paid") && o.status !== "cancelled").length,
    },
    {
      id: "cancelled",
      label: t.statusCancelled || "Cancelled",
      count: orders.filter((o) => o.status === "cancelled").length,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight drop-shadow-sm">{t.title}</h1>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" title="Realtime Updates Active" />
          </div>
          <p className="text-sm lg:text-base font-medium text-slate-500 mt-1">
            {t.desc} — Realtime monitoring active.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4" />
          {tc.refresh}
        </Button>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="capitalize">{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                statusFilter === tab.id ? "bg-slate-800 text-mint-400" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8 text-slate-400" />}
            title={t.noOrders}
            description="Incoming orders will automatically appear here live."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = (order.status === "pending" || order.status === "pending_payment") && order.payment_status !== "paid";
            const isConfirmed = (order.status === "confirmed" || order.status === "paid" || order.payment_status === "paid") && order.status !== "cancelled";
            const isCancelled = order.status === "cancelled";
            const nextStatusLabel = isPending ? "Confirm Order" : null;

            const isPreOrder = Boolean(order.is_pre_order || order.payment_method === "pre_order");
            const orderTotal = order.total ?? order.grand_total ?? 0;
            const advancePaid = isPreOrder
              ? (order.advance_amount !== undefined && order.advance_amount > 0 ? order.advance_amount : Number((orderTotal * 0.5).toFixed(2)))
              : (order.payment_status === "paid" ? orderTotal : 0);
            const remainingBal = isPreOrder
              ? (order.payment_status === "paid" ? 0 : (order.remaining_amount !== undefined ? order.remaining_amount : Number((orderTotal - advancePaid).toFixed(2))))
              : (order.payment_status === "paid" ? 0 : orderTotal);

            const badgeText = isCancelled ? "Cancelled" : isConfirmed ? "Confirmed" : "Pending";
            const badgeVariant = isCancelled ? "danger" : isConfirmed ? "mint" : "warning";

            return (
              <Card
                key={order.id}
                padding="md"
                className={`transition-all ${
                  isPending
                    ? "border-2 border-amber-300 bg-amber-50/20 shadow-md"
                    : isConfirmed
                    ? "border-emerald-200 bg-emerald-50/10"
                    : "border-slate-200 opacity-75"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-900">
                        #{order.order_number}
                      </h2>

                      {isPreOrder && (
                        <Badge variant="mint" size="md" className="font-extrabold bg-purple-100 text-purple-900 border border-purple-300 shadow-xs">
                          Pre-Order (50% Advance)
                        </Badge>
                      )}

                      {order.token_number && (
                        <Badge variant="mint" size="md" className="font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                          Token: BSH-{order.token_number}
                        </Badge>
                      )}

                      {order.table_number && (
                        <Badge variant="mint" size="md" className="font-extrabold">
                          <Utensils className="h-3 w-3 mr-1" />
                          {order.table_number}
                        </Badge>
                      )}

                      <Badge variant={badgeVariant} className="capitalize font-black">
                        {badgeText}
                      </Badge>

                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatOrderAge(order.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {order.customer_name && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {order.customer_name}
                        </span>
                      )}
                      {order.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {order.customer_phone}
                        </span>
                      )}
                      <span>
                        Payment: <strong className="uppercase text-slate-700">{order.payment_method || "cash"}</strong> ({order.payment_status})
                      </span>
                    </div>

                    {isPreOrder && (
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold bg-emerald-50/90 border border-emerald-200 p-2.5 rounded-xl text-slate-800">
                        <span>Total: <strong className="text-slate-900">{formatCurrency(orderTotal)}</strong></span>
                        <span className="text-emerald-700">Paid Advance (50%): <strong>{formatCurrency(advancePaid)}</strong></span>
                        <span className={remainingBal > 0 ? "text-amber-700 font-extrabold" : "text-emerald-700 font-extrabold"}>
                          Remaining at Collection: <strong>{formatCurrency(remainingBal)}</strong>
                        </span>
                      </div>
                    )}

                    {order.notes && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200/60 p-2 rounded-xl">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>Order note: <strong>{order.notes}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Total */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {formatCurrency(orderTotal)}
                    </span>

                    {isPreOrder && remainingBal > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-extrabold shadow-xs"
                        onClick={() => markRemainingPaid(order)}
                        leftIcon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
                      >
                        {t.markRemainingPaid || `Mark Remaining (${formatCurrency(remainingBal)}) Paid`}
                      </Button>
                    ) : order.payment_status === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-extrabold"
                        onClick={() => togglePaymentStatus(order)}
                        leftIcon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
                      >
                        {t.markCashPaid || "Mark Cash Received"}
                      </Button>
                    ) : (
                      <Badge variant="success" size="md" className="font-bold">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    )}

                    {isPending && nextStatusLabel && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateStatus(order)}
                        leftIcon={<Bell className="h-4 w-4" />}
                      >
                        {nextStatusLabel}
                      </Button>
                    )}

                    {!isCancelled && (
                      <Button size="sm" variant="danger" onClick={() => cancelOrder(order)}>
                        {t.statusCancelled}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Items Container */}
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>
                      {order.order_items?.length || 0} items ordered
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveOrder((prev) => (prev === order.id ? null : order.id))}
                      className="font-bold text-mint-600 hover:text-mint-700"
                    >
                      {activeOrder === order.id ? tc.collapse : tc.viewAll}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(activeOrder === order.id
                      ? order.order_items
                      : order.order_items?.slice(0, 3)
                    )?.map((item: OrderItem) => {
                      const itemName = item.name || item.product_name || "Item";
                      const itemTotal = item.total ?? item.line_total ?? (item.price || item.unit_price || 0) * item.quantity;
                      return (
                        <div key={item.id} className="flex items-start justify-between gap-4 py-1">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.quantity}× {itemName}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-amber-600 font-medium italic mt-0.5">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 tabular-nums">
                            {formatCurrency(itemTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!activeOrder && (order.order_items?.length || 0) > 3 && (
                    <p className="text-[11px] text-slate-400 mt-2 italic">
                      + {(order.order_items?.length || 0) - 3} more items...
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
