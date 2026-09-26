"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  UserPlus,
  Trash2,
  MoreVertical,
  Shield,
  DollarSign,
  Eye,
  Edit,
  ClipboardList,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Building2,
  Power,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Employee, Profile, EmployeeTask } from "@/lib/types";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";
import { useLanguageStore } from "@/stores/language-store";
import { assignTaskWithNotification } from "@/lib/task-service";

interface EmployeeWithProfile extends Employee {
  profile: Profile;
}

export default function EmployeesPage() {
  const { user, shop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].employeesPage;
  
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Dropdown Menu State
  const [openMenuEmpId, setOpenMenuEmpId] = useState<string | null>(null);

  // Modal States
  const [selectedViewEmp, setSelectedViewEmp] = useState<EmployeeWithProfile | null>(null);
  const [selectedEditEmp, setSelectedEditEmp] = useState<EmployeeWithProfile | null>(null);
  const [selectedTaskEmp, setSelectedTaskEmp] = useState<EmployeeWithProfile | null>(null);

  // Add Employee Form
  const [addForm, setAddForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "staff",
    salary: "",
  });

  // Edit Employee Form
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    role: "staff",
    salary: "",
  });

  // Stock Checklist State for Task Assignment
  const [shopStockItems, setShopStockItems] = useState<any[]>([]);
  const [selectedItemsState, setSelectedItemsState] = useState<Record<string, { checked: boolean; quantity: string }>>({});
  const [isLoadingStockItems, setIsLoadingStockItems] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");

  // Assign Task Form & List State
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    due_date: "",
  });
  const [empTasks, setEmpTasks] = useState<EmployeeTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!shop) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("shop_id", shop.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      setEmployees((data as unknown as EmployeeWithProfile[]) || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Close open dropdown menu when clicking anywhere else
  useEffect(() => {
    function handleOutsideClick() {
      setOpenMenuEmpId(null);
    }
    if (openMenuEmpId) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [openMenuEmpId]);

  // 1. ADD EMPLOYEE
  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;

    const email = addForm.email.trim();
    const fullName = addForm.full_name.trim();
    const phone = addForm.phone.trim();
    const role = addForm.role;
    const salary = addForm.salary ? parseFloat(addForm.salary) : null;

    if (!email || !fullName) {
      toast.error("Please enter both Full Name and Email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: fullName,
          phone: phone || null,
          role,
          salary,
          shop_id: shop.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add employee.");
      }

      toast.success(data.message || `Employee "${fullName}" added successfully!`);
      setShowAddModal(false);
      setAddForm({ email: "", full_name: "", phone: "", role: "staff", salary: "" });
      fetchEmployees();
    } catch (error: any) {
      console.error("Add employee error:", error);
      toast.error(error?.message || "Failed to add employee. Please check input and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 2. EDIT EMPLOYEE
  function openEditModal(emp: EmployeeWithProfile) {
    setSelectedEditEmp(emp);
    setEditForm({
      full_name: emp.profile?.full_name || "",
      phone: emp.profile?.phone || "",
      role: emp.role || "staff",
      salary: emp.salary ? String(emp.salary) : "",
    });
    setOpenMenuEmpId(null);
  }

  async function handleSaveEditEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEditEmp || !shop) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Update Profile table
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim() || null,
        })
        .eq("id", selectedEditEmp.profile_id);

      if (profErr) console.warn("Profile update notice:", profErr);

      // Update Employees table
      const { error: empErr } = await supabase
        .from("employees")
        .update({
          role: editForm.role,
          salary: editForm.salary ? parseFloat(editForm.salary) : null,
        })
        .eq("id", selectedEditEmp.id);

      if (empErr) throw empErr;

      toast.success(`Updated details for ${editForm.full_name}`);
      setSelectedEditEmp(null);
      fetchEmployees();
    } catch (err: any) {
      console.error("Edit employee error:", err);
      toast.error(err?.message || "Failed to update employee details.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 3. ASSIGN TASK WITH STOCK CHECKLIST
  async function openTaskModal(emp: EmployeeWithProfile) {
    setSelectedTaskEmp(emp);
    setTargetEmployeeId(emp.id);
    setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
    setSelectedItemsState({});
    setOpenMenuEmpId(null);

    if (shop) {
      setIsLoadingTasks(true);
      setIsLoadingStockItems(true);
      try {
        const [taskRes, stockRes] = await Promise.all([
          fetch(`/api/employee/tasks?shop_id=${shop.id}&employee_id=${emp.id}`),
          fetch(`/api/employee/stock?shop_id=${shop.id}`),
        ]);

        const taskData = await taskRes.json();
        const stockData = await stockRes.json();

        if (taskRes.ok && taskData.success && Array.isArray(taskData.tasks)) {
          setEmpTasks(taskData.tasks);
        } else {
          setEmpTasks([]);
        }

        if (stockRes.ok && stockData.success && Array.isArray(stockData.items)) {
          setShopStockItems(stockData.items);
          const initialSelection: Record<string, { checked: boolean; quantity: string }> = {};
          stockData.items.forEach((it: any) => {
            initialSelection[it.id] = { checked: false, quantity: "" };
          });
          setSelectedItemsState(initialSelection);
        } else {
          setShopStockItems([]);
        }
      } catch (err) {
        console.warn("Error opening task modal:", err);
      } finally {
        setIsLoadingTasks(false);
        setIsLoadingStockItems(false);
      }
    }
  }

  async function handleAssignTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    const activeEmp = employees.find((e) => e.id === targetEmployeeId) || selectedTaskEmp;
    if (!activeEmp || !shop) {
      toast.error("Please select an employee.");
      return;
    }

    const selectedEntries = Object.entries(selectedItemsState).filter(
      ([_, v]) => v.checked && Number(v.quantity) > 0
    );

    if (selectedEntries.length === 0) {
      toast.error("Please select at least one stock item and enter a valid quantity (> 0).");
      return;
    }

    // Build structured items array
    const taskItems = selectedEntries.map(([id, v]) => {
      const stockIt = shopStockItems.find((s) => s.id === id);
      return {
        inventory_id: stockIt?.inventory_id || id,
        menu_item_id: stockIt?.menu_item_id || id,
        name: stockIt?.name || "Item",
        quantity: Math.max(1, parseInt(v.quantity, 10) || 0),
        unit: stockIt?.unit || "pcs",
        price: stockIt?.price,
      };
    });

    const generatedTitle = `Stock Update — ` + taskItems.map((i) => `${i.name} (${i.quantity})`).join(", ");

    setIsSubmitting(true);
    try {
      const result = await assignTaskWithNotification({
        shop_id: shop.id,
        employee_id: activeEmp.id,
        employee_profile_id: activeEmp.profile_id,
        employee_name: activeEmp.profile?.full_name || "Employee",
        employee_mobile: activeEmp.profile?.phone || "",
        title: generatedTitle,
        description: taskForm.description.trim() || undefined,
        priority: taskForm.priority,
        due_date: taskForm.due_date || undefined,
        assigned_by_id: user?.id,
        assigned_by_name: user?.full_name || "Shopkeeper",
        shop_name: shop.name || "BISHOP Shop",
        task_items: taskItems,
        items: taskItems,
      });

      if (result.isDuplicate) {
        toast.info(`Task "${result.task.title}" is already assigned.`);
      } else {
        toast.success(`Task assigned and BISHOP notification sent to ${activeEmp.profile?.full_name || "employee"}!`);
      }

      // AUTOMATICALLY CLOSE ASSIGN TASK MODAL UPON SUCCESS (REQ 5)
      setSelectedTaskEmp(null);
      setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
      setSelectedItemsState({});
    } catch (err: any) {
      console.error("Assign task error:", err);
      toast.error(err?.message || "Failed to assign task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 4. TOGGLE ACTIVATE / DEACTIVATE STATUS
  async function toggleEmployeeStatus(emp: EmployeeWithProfile) {
    setOpenMenuEmpId(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("employees")
        .update({ is_active: !emp.is_active })
        .eq("id", emp.id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, is_active: !e.is_active } : e))
      );

      toast.success(emp.is_active ? "Employee deactivated" : "Employee activated");
    } catch {
      toast.error("Failed to update employee status");
    }
  }

  // 6. DELETE EMPLOYEE
  async function deleteEmployee(emp: EmployeeWithProfile) {
    setOpenMenuEmpId(null);
    if (!confirm(`Remove ${emp.profile?.full_name || "this employee"}?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("employees").delete().eq("id", emp.id);

      if (error) throw error;

      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      toast.success("Employee removed");
    } catch {
      toast.error("Failed to remove employee");
    }
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.role?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.desc}</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowAddModal(true)}
        >
          {t.addEmployee}
        </Button>
      </motion.div>

      {/* Search */}
      {employees.length > 0 && (
        <Input
          placeholder={t.searchEmp}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="max-w-sm"
        />
      )}

      {/* Employee List */}
      {filteredEmployees.length === 0 && employees.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-400" />}
            title={t.noEmpTitle}
            description={t.noEmpDesc}
            action={
              <Button
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setShowAddModal(true)}
              >
                {t.addFirstEmp}
              </Button>
            }
          />
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card padding="md" className="text-center py-10">
          <p className="text-slate-500">{t.noEmpMatch}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredEmployees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card padding="md" className="flex items-center gap-4 relative overflow-visible">
                {/* Avatar */}
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
                  {emp.profile?.full_name?.charAt(0)?.toUpperCase() || "E"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate">
                      {emp.profile?.full_name || t.unknown}
                    </p>
                    <Badge
                      variant={emp.is_active ? "success" : "default"}
                      size="sm"
                    >
                      {emp.is_active ? t.active : t.inactive}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {emp.profile?.email && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {emp.profile.email}
                      </span>
                    )}
                    {emp.profile?.phone && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {emp.profile.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-500 uppercase font-bold tracking-wider">
                      <Shield className="h-3 w-3 text-slate-400" />
                      {emp.role}
                    </span>
                    {emp.salary && (
                      <span className="flex items-center gap-1 text-xs font-bold text-mint-700">
                        <DollarSign className="h-3 w-3 text-mint-500" />₹
                        {emp.salary.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Three-Dot (⋮) Action Dropdown Menu */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setOpenMenuEmpId(openMenuEmpId === emp.id ? null : emp.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"
                    title="Employee Actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown Popover */}
                  <AnimatePresence>
                    {openMenuEmpId === emp.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 overflow-hidden"
                      >
                        {/* 1. View Details */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedViewEmp(emp);
                            setOpenMenuEmpId(null);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                          {t.viewDetails}
                        </button>

                        {/* 2. Edit Details */}
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                        >
                          <Edit className="h-4 w-4 text-amber-500" />
                          {t.editEmployee}
                        </button>

                        {/* 3. Assign Task */}
                        <button
                          type="button"
                          onClick={() => openTaskModal(emp)}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                        >
                          <ClipboardList className="h-4 w-4 text-purple-500" />
                          {t.assignTask}
                        </button>

                        {/* 4. Activate / Deactivate */}
                        <button
                          type="button"
                          onClick={() => toggleEmployeeStatus(emp)}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                        >
                          <Power className={`h-4 w-4 ${emp.is_active ? "text-amber-600" : "text-emerald-600"}`} />
                          {emp.is_active ? t.inactive : t.active}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL 1: ADD EMPLOYEE */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t.addEmployee}
        description={t.createDesc}
        size="md"
      >
        <form onSubmit={handleAddEmployee} className="space-y-4">
          <Input
            label={t.fullName}
            value={addForm.full_name}
            onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
            placeholder="John Doe"
            required
          />
          <Input
            label={t.email}
            type="email"
            value={addForm.email}
            onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            placeholder="employee@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            required
          />
          <Input
            label={t.phone}
            type="tel"
            value={addForm.phone}
            onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            placeholder="+91 98765 43210"
            leftIcon={<Phone className="h-4 w-4" />}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">{t.role}</label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500"
              >
                <option value="staff">Staff</option>
                <option value="chef">Chef</option>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
            <Input
              label={t.salary}
              type="number"
              value={addForm.salary}
              onChange={(e) => setAddForm({ ...addForm, salary: e.target.value })}
              placeholder="15000"
              min="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" isLoading={isSubmitting} leftIcon={<UserPlus className="h-4 w-4" />}>
              {t.addEmployee}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW EMPLOYEE DETAILS */}
      <Modal
        isOpen={Boolean(selectedViewEmp)}
        onClose={() => setSelectedViewEmp(null)}
        title={t.viewDetails}
        description={selectedViewEmp?.profile?.full_name || ""}
        size="md"
      >
        {selectedViewEmp && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-sm shrink-0">
                {selectedViewEmp.profile?.full_name?.charAt(0)?.toUpperCase() || "E"}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedViewEmp.profile?.full_name || "Employee"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedViewEmp.is_active ? "success" : "default"}>
                    {selectedViewEmp.is_active ? t.active : t.inactive}
                  </Badge>
                  <span className="text-xs uppercase font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    {selectedViewEmp.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">{t.email}</span>
                <p className="font-semibold text-slate-800 truncate">{selectedViewEmp.profile?.email || "N/A"}</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">{t.phone}</span>
                <p className="font-semibold text-slate-800">{selectedViewEmp.profile?.phone || "N/A"}</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">{t.salary}</span>
                <p className="font-extrabold text-mint-700">
                  {selectedViewEmp.salary ? `₹${selectedViewEmp.salary.toLocaleString("en-IN")}` : "N/A"}
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">{t.role}</span>
                <p className="font-semibold text-slate-800">
                  {selectedViewEmp.role}
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center pt-2">
              <Button onClick={() => setSelectedViewEmp(null)}>{t.cancel}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT EMPLOYEE */}
      <Modal
        isOpen={Boolean(selectedEditEmp)}
        onClose={() => setSelectedEditEmp(null)}
        title={t.editEmployee}
        description={selectedEditEmp?.profile?.full_name || ""}
        size="md"
      >
        <form onSubmit={handleSaveEditEmployee} className="space-y-4">
          <Input
            label={t.fullName}
            value={editForm.full_name}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
            required
          />

          <Input
            label={t.phone}
            type="tel"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            placeholder="+91 98765 43210"
            leftIcon={<Phone className="h-4 w-4" />}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">{t.role}</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500"
              >
                <option value="staff">Staff</option>
                <option value="chef">Chef</option>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            <Input
              label={t.salary}
              type="number"
              value={editForm.salary}
              onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
              placeholder="15000"
              min="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setSelectedEditEmp(null)}>
              {t.cancel}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t.editEmployee}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: ASSIGN TASK WITH STOCK CHECKLIST */}
      <Modal
        isOpen={Boolean(selectedTaskEmp)}
        onClose={() => setSelectedTaskEmp(null)}
        title={t.assignTask}
        description=""
        size="lg"
      >
        <div className="space-y-6">
          {/* New Task Form */}
          <form onSubmit={handleAssignTaskSubmit} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* 1. Select Employee */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                Select Employee:
              </label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || "Employee"} ({emp.role || "Staff"})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Stock Items Checklist */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider block">
                Select Items & Task Quantities:
              </label>

              {isLoadingStockItems ? (
                <div className="py-6 text-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : shopStockItems.length === 0 ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 font-semibold text-center">
                  No stock items available in shop inventory.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                  {shopStockItems.map((item) => {
                    const currentState = selectedItemsState[item.id] || { checked: false, quantity: "" };

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                          currentState.checked
                            ? "bg-purple-50/80 border-purple-300"
                            : "bg-slate-50/50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            id={`stock_item_${item.id}`}
                            checked={currentState.checked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedItemsState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  checked,
                                  quantity: checked ? (prev[item.id]?.quantity || "10") : "",
                                },
                              }));
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded cursor-pointer"
                          />

                          <label htmlFor={`stock_item_${item.id}`} className="flex items-center gap-2 text-xs cursor-pointer truncate">
                            <span className="font-extrabold text-slate-900">{item.name}</span>
                            {item.price !== undefined && item.price !== null && (
                              <span className="font-semibold text-slate-500">₹{item.price}/{item.unit || "pcs"}</span>
                            )}
                            <Badge variant="default" size="sm" className="bg-slate-100 text-slate-600 border-slate-200">
                              Current Stock: {item.quantity} {item.unit || "pcs"}
                            </Badge>
                          </label>
                        </div>

                        {/* Quantity Input */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-extrabold text-slate-500">Quantity:</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            disabled={!currentState.checked}
                            value={currentState.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedItemsState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  checked: true,
                                  quantity: val,
                                },
                              }));
                            }}
                            className="w-20 h-8 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Generated Title Preview */}
            {(() => {
              const selectedEntries = Object.entries(selectedItemsState).filter(
                ([_, v]) => v.checked && Number(v.quantity) > 0
              );
              if (selectedEntries.length > 0) {
                const previewText = selectedEntries
                  .map(([id, v]) => {
                    const item = shopStockItems.find((s) => s.id === id);
                    return `${item?.name || "Item"} (${v.quantity})`;
                  })
                  .join(", ");

                return (
                  <div className="p-2.5 bg-purple-100/60 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between gap-2">
                    <span className="font-extrabold">Generated Title:</span>
                    <span className="font-bold truncate">Stock Update — {previewText}</span>
                  </div>
                );
              }
              return null;
            })()}

            {/* 3. Additional Instructions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                {t.taskDesc} (Optional Instructions):
              </label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="e.g. Please refill the evening stock."
                rows={2}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">{t.priority}</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="low">{t.lowPriority}</option>
                  <option value="medium">{t.mediumPriority}</option>
                  <option value="high">{t.highPriority}</option>
                </select>
              </div>

              <Input
                label={t.dueDate}
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" isLoading={isSubmitting} leftIcon={<Plus className="h-4 w-4" />}>
                {t.assignTask}
              </Button>
            </div>
          </form>

          {/* Assigned Tasks List */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {t.assignTask} ({empTasks.length})
            </h4>

            {isLoadingTasks ? (
              <div className="py-6 text-center">
                <LoadingSpinner size="md" />
              </div>
            ) : empTasks.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                {t.noEmpMatch}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {empTasks.map((tk) => (
                  <div key={tk.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{tk.title}</span>
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
                          {tk.priority}
                        </Badge>
                      </div>
                      {tk.description && <p className="text-slate-500">{tk.description}</p>}
                      {tk.due_date && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {t.dueDate}: {tk.due_date}
                        </span>
                      )}
                    </div>
                    <Badge variant={tk.status === "completed" ? "success" : tk.status === "in_progress" ? "default" : "warning"}>
                      {tk.status === "assigned" || tk.status === "pending"
                        ? "Pending"
                        : tk.status === "in_progress" || tk.status === "accepted"
                        ? "In Progress"
                        : "Completed"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedTaskEmp(null)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
