"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "framer-motion";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Play,
  Calendar,
  UserCheck,
  AlertCircle,
  Filter,
  Shield,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { EmployeeTask, Employee, Profile, TaskStatus } from "@/lib/types";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";
import { useLanguageStore } from "@/stores/language-store";
import { updateTaskStatusAndNotify, fetchEmployeeTasksApi } from "@/lib/task-service";

interface ExtendedTask extends EmployeeTask {
  employee?: Employee & { profile?: Profile };
  assigned_by_profile?: Profile;
}

export default function TasksPage() {
  const { user, shop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].tasksPage;
  const tc = DASHBOARD_TRANSLATIONS[lang || "en"].common;
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "in_progress" | "completed">("all");

  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  const isShopOwner = user?.role === "shopkeeper" || !user?.role;

  // Load active user's employee record if they are an employee
  useEffect(() => {
    async function loadEmployeeIdentity() {
      if (!user?.id || !shop?.id) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("employees")
          .select("id")
          .eq("profile_id", user.id)
          .eq("shop_id", shop.id)
          .maybeSingle();

        if (data?.id) {
          setCurrentEmployeeId(data.id);
        }
      } catch (err) {
        console.warn("Error resolving employee record:", err);
      }
    }
    loadEmployeeIdentity();
  }, [user, shop]);

  const tasksRef = useRef<ExtendedTask[]>([]);
  const hasLoadedInitialRef = useRef(false);

  // Fetch Tasks (isSilent = true for background polling & realtime updates to prevent visual blinking)
  const fetchTasks = useCallback(async (isSilent = false) => {
    if (!shop) return;
    
    // Show loading spinner ONLY on the very first initial load
    if (!isSilent && !hasLoadedInitialRef.current && tasksRef.current.length === 0) {
      setIsLoading(true);
    }

    try {
      const supabase = createClient();

      let query = supabase
        .from("employee_tasks")
        .select(`
          *,
          employee:employees(
            id,
            role,
            profile:profiles(*)
          ),
          assigned_by_profile:profiles!employee_tasks_assigned_by_fkey(*)
        `)
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });

      if (!isShopOwner && currentEmployeeId) {
        query = query.eq("employee_id", currentEmployeeId);
      }

      const { data, error } = await query;
      let fetchedTasks: ExtendedTask[] = [];

      if (error || !data || data.length === 0) {
        const apiTasks = await fetchEmployeeTasksApi(
          shop.id,
          !isShopOwner && currentEmployeeId ? currentEmployeeId : undefined
        );
        fetchedTasks = (apiTasks as ExtendedTask[]) || [];
      } else {
        fetchedTasks = (data as ExtendedTask[]) || [];
      }

      // Deep compare signatures to prevent unnecessary React re-renders if data is identical
      const currentSig = JSON.stringify(
        tasksRef.current.map((t) => ({ id: t.id, status: t.status, updated_at: t.updated_at, title: t.title }))
      );
      const newSig = JSON.stringify(
        fetchedTasks.map((t) => ({ id: t.id, status: t.status, updated_at: t.updated_at, title: t.title }))
      );

      if (currentSig !== newSig || !hasLoadedInitialRef.current) {
        tasksRef.current = fetchedTasks;
        setTasks(fetchedTasks);
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      hasLoadedInitialRef.current = true;
      setIsLoading(false);
    }
  }, [shop, isShopOwner, currentEmployeeId]);

  // Initial load
  useEffect(() => {
    fetchTasks(false);
  }, [fetchTasks]);

  // Realtime subscription & silent polling fallback (ZERO blinking)
  useEffect(() => {
    if (!shop?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`shop-tasks-realtime-${shop.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_tasks",
          filter: `shop_id=eq.${shop.id}`,
        },
        () => {
          fetchTasks(true);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchTasks(true);
    }, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [shop?.id, fetchTasks]);

  // Update Task Status handler (Assigned -> Accepted/In Progress -> Completed)
  async function handleUpdateTaskStatus(taskId: string, newStatus: TaskStatus) {
    if (!shop?.id) return;
    try {
      await updateTaskStatusAndNotify(taskId, newStatus, shop.id, user?.id);

      setTasks((prev) =>
        prev.map((tk) => (tk.id === taskId ? { ...tk, status: newStatus } : tk))
      );

      toast.success(
        newStatus === "completed"
          ? "Task completed! Great job 🎉"
          : "Task accepted! Status updated to Accepted / In Progress."
      );
    } catch (err: any) {
      console.error("Error updating task status:", err);
      toast.error(err?.message || "Failed to update task status.");
    }
  }

  const filteredTasks = tasks.filter((tk) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "assigned") return tk.status === "assigned" || tk.status === "pending";
    if (statusFilter === "in_progress") return tk.status === "in_progress" || tk.status === "accepted";
    if (statusFilter === "completed") return tk.status === "completed";
    return true;
  });

  const pendingCount = tasks.filter((tk) => tk.status === "assigned" || tk.status === "pending").length;
  const inProgressCount = tasks.filter((tk) => tk.status === "in_progress" || tk.status === "accepted").length;
  const completedCount = tasks.filter((tk) => tk.status === "completed").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {isShopOwner ? t.titleShopkeeper : t.titleEmployee}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isShopOwner ? t.descShopkeeper : t.descEmployee}
          </p>
        </div>

        {isShopOwner && (
          <a href="/dashboard/employees">
            <Button size="sm" leftIcon={<ClipboardList className="h-4 w-4" />}>
              {t.assignNewTask}
            </Button>
          </a>
        )}
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">{t.pending}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-950">{pendingCount}</p>
        </div>

        <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 text-blue-900 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">{t.inProgress}</span>
            <Play className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-950">{inProgressCount}</p>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-emerald-900 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">{t.completed}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-950">{completedCount}</p>
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
            statusFilter === "all"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t.allFilter} ({tasks.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("assigned")}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
            statusFilter === "assigned"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t.pendingFilter} ({pendingCount})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("in_progress")}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
            statusFilter === "in_progress"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t.inProgressFilter} ({inProgressCount})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("completed")}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
            statusFilter === "completed"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t.completedFilter} ({completedCount})
        </button>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ClipboardList className="h-8 w-8 text-slate-400" />}
            title={t.noTasksTitle}
            description={
              isShopOwner
                ? t.noTasksDescShopkeeper
                : t.noTasksDescEmployee
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((tk, i) => (
            <motion.div
              key={tk.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card padding="md" className="space-y-3 border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base">{tk.title}</h3>
                      <Badge
                        variant={
                          tk.priority === "high"
                            ? "danger"
                            : tk.priority === "medium"
                            ? "warning"
                            : "default"
                        }
                        size="sm"
                      >
                        {tk.priority} {t.priorityTag}
                      </Badge>
                    </div>

                    {tk.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{tk.description}</p>
                    )}
                    {/* Multi-item Task Breakdown */}
                    {((tk.items && tk.items.length > 0) || (tk.task_items && tk.task_items.length > 0)) && (
                      <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 space-y-1.5">
                        <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block">
                          Stock Items:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(tk.items || tk.task_items || []).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                              <span className="font-extrabold text-slate-900">{item.name}</span>
                              <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                {item.name} × {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {(tk.status === "assigned" || tk.status === "pending") && (
                      <Badge variant="warning" className="flex items-center gap-1 font-bold">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                    {(tk.status === "in_progress" || tk.status === "accepted") && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <Play className="h-3 w-3 fill-blue-600" />
                        In Progress
                      </span>
                    )}
                    {tk.status === "completed" && (
                      <Badge variant="success" className="flex items-center gap-1 font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap text-xs text-slate-500">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Employee Name */}
                    {isShopOwner && tk.employee?.profile?.full_name && (
                      <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                        Employee: {tk.employee.profile.full_name} ({tk.employee.role || "Staff"})
                      </span>
                    )}

                    {/* Assigned By (for Employees) */}
                    {!isShopOwner && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Shield className="h-3.5 w-3.5 text-slate-400" />
                        {t.assignedBy}: <strong className="text-slate-800">{tk.assigned_by_profile?.full_name || shop?.name || tc.shopkeeper}</strong>
                      </span>
                    )}

                    {/* Assigned Date/Time */}
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Assigned: <strong className="text-slate-700">{new Date(tk.created_at).toLocaleString("en-IN")}</strong>
                    </span>

                    {/* Started Date/Time (when In Progress or Completed) */}
                    {(tk.status === "in_progress" || tk.status === "accepted" || tk.status === "completed") && (
                      <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        <Play className="h-3 w-3 fill-blue-600 text-blue-600" />
                        Started: {new Date(tk.updated_at || tk.created_at).toLocaleString("en-IN")}
                      </span>
                    )}

                    {/* Due Date */}
                    {tk.due_date && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {t.due}: <strong className="text-slate-700">{tk.due_date}</strong>
                      </span>
                    )}
                  </div>

                  {/* Employee Action Buttons (Hidden for Shopkeeper; DISPLAY ONLY) */}
                  {!isShopOwner && (
                    <div className="flex items-center gap-2">
                      {(tk.status === "assigned" || tk.status === "pending") && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm"
                          leftIcon={<Play className="h-3.5 w-3.5 fill-white" />}
                          onClick={() => handleUpdateTaskStatus(tk.id, "in_progress")}
                        >
                          Accept & Start Task
                        </Button>
                      )}

                      {(tk.status === "in_progress" || tk.status === "accepted") && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm"
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          onClick={() => handleUpdateTaskStatus(tk.id, "completed")}
                        >
                          {t.markCompleted}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
