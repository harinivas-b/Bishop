"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  TrendingDown,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import type { InventoryItem } from "@/lib/types";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";
import { useLanguageStore } from "@/stores/language-store";

type SortField = "name" | "quantity" | "cost_per_unit" | "updated_at";
type SortDir = "asc" | "desc";

export default function InventoryPage() {
  const { shop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].inventoryPage;
  const tc = DASHBOARD_TRANSLATIONS[lang || "en"].common;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const emptyForm = {
    name: "",
    unit: "kg",
    quantity: "",
    min_quantity: "",
    cost_per_unit: "",
    supplier: "",
  };
  const [form, setForm] = useState(emptyForm);

  const fetchItems = useCallback(async () => {
    if (!shop) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("shop_id", shop.id)
        .order(sortField, { ascending: sortDir === "asc" });

      if (error) throw error;
      setItems((data as InventoryItem[]) || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  }, [shop, sortField, sortDir]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openAddModal() {
    setEditingItem(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      unit: item.unit,
      quantity: item.quantity.toString(),
      min_quantity: item.min_quantity.toString(),
      cost_per_unit: item.cost_per_unit.toString(),
      supplier: item.supplier || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const payload = {
        shop_id: shop.id,
        name: form.name.trim(),
        unit: form.unit,
        quantity: parseFloat(form.quantity) || 0,
        min_quantity: parseFloat(form.min_quantity) || 0,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        supplier: form.supplier.trim() || null,
      };

      if (editingItem) {
        // Update
        const { error } = await supabase
          .from("inventory")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Item updated");
      } else {
        // Insert
        const { error } = await supabase.from("inventory").insert(payload);
        if (error) throw error;
        toast.success("Item added to inventory");
      }

      setShowModal(false);
      setForm(emptyForm);
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error("Inventory save error:", error);
      toast.error("Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestock(item: InventoryItem) {
    const qty = prompt(`Restock "${item.name}"?\nEnter quantity to add:`);
    if (!qty || isNaN(Number(qty))) return;

    try {
      const supabase = createClient();
      const newQty = item.quantity + parseFloat(qty);
      const { error } = await supabase
        .from("inventory")
        .update({
          quantity: newQty,
          last_restocked: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: newQty, last_restocked: new Date().toISOString() }
            : i
        )
      );
      toast.success(`Restocked ${qty} ${item.unit} of ${item.name}`);
    } catch {
      toast.error("Failed to restock");
    }
  }

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}" from inventory?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete item");
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Filter and derive data
  const lowStockItems = items.filter(
    (item) => item.quantity <= item.min_quantity && item.min_quantity > 0
  );

  const filteredItems = items
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((item) =>
      filterLowStock
        ? item.quantity <= item.min_quantity && item.min_quantity > 0
        : true
    );

  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * item.cost_per_unit,
    0
  );

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
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t.desc}
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openAddModal}
        >
          {t.addItem}
        </Button>
      </motion.div>

      {/* Stats Row */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Box className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{items.length}</p>
                <p className="text-xs text-slate-400">Total Items</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-mint-50 flex items-center justify-center">
                <Package className="h-4 w-4 text-mint-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(totalValue)}
                </p>
                <p className="text-xs text-slate-400">Stock Value</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  lowStockItems.length > 0
                    ? "bg-red-50"
                    : "bg-emerald-50"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 ${
                    lowStockItems.length > 0
                      ? "text-red-500"
                      : "text-emerald-500"
                  }`}
                />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {lowStockItems.length}
                </p>
                <p className="text-xs text-slate-400">{t.lowStock}</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {items.filter((i) => i.quantity === 0).length}
                </p>
                <p className="text-xs text-slate-400">{t.lowStock}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card padding="md" className="border-amber-200 bg-amber-50/50">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800 text-sm">
                  {t.lowStock}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {lowStockItems.map((i) => i.name).join(", ")}{" "}
                  {t.noItemsDesc}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterLowStock(!filterLowStock)}
                className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {filterLowStock ? tc.viewAll : tc.filter}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Search + Sort */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="sm:max-w-xs"
          />
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { field: "name", label: t.name },
                { field: "quantity", label: t.quantity },
                { field: "cost_per_unit", label: t.costPerUnit },
              ] as { field: SortField; label: string }[]
            ).map(({ field, label }) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortField === field
                    ? "bg-mint-50 text-mint-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <ArrowUpDown className="h-3 w-3" />
                {label}
                {sortField === field && (sortDir === "asc" ? " ↑" : " ↓")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inventory List */}
      {filteredItems.length === 0 && items.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Package className="h-8 w-8 text-slate-400" />}
            title={t.noItemsTitle}
            description={t.noItemsDesc}
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={openAddModal}
              >
                {t.addFirstItem}
              </Button>
            }
          />
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card padding="md" className="text-center py-10">
          <p className="text-slate-500">
            {t.noMatch}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item, i) => {
            const isLow =
              item.quantity <= item.min_quantity && item.min_quantity > 0;
            const isOut = item.quantity === 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  padding="md"
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 ${
                    isOut
                      ? "border-red-200 bg-red-50/30"
                      : isLow
                        ? "border-amber-200 bg-amber-50/30"
                        : ""
                  }`}
                >
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {isOut && <Badge variant="danger">Out of Stock</Badge>}
                      {isLow && !isOut && (
                        <Badge variant="warning">{t.lowStock}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="text-sm text-slate-600">
                        <span className="font-semibold">
                          {item.quantity}
                        </span>{" "}
                        {item.unit}
                      </span>
                      <span className="text-xs text-slate-400">
                        Min: {item.min_quantity} {item.unit}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatCurrency(item.cost_per_unit)}/{item.unit}
                      </span>
                      {item.supplier && (
                        <span className="text-xs text-slate-400">
                          {t.supplier}: {item.supplier}
                        </span>
                      )}
                      {item.last_restocked && (
                        <span className="text-xs text-slate-400">
                          {t.restocked} {formatDate(item.last_restocked)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRestock(item)}
                      className="p-2 rounded-lg text-slate-400 hover:text-mint-600 hover:bg-mint-50 transition-colors"
                      title="Restock"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          setForm(emptyForm);
        }}
        title={editingItem ? t.editItem : t.addItem}
        description={""}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t.name}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="All-purpose flour"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">{t.unit}</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
                <option value="dozen">dozen</option>
                <option value="box">box</option>
                <option value="pack">pack</option>
              </select>
            </div>
            <Input
              label={t.quantity}
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="10"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.minQuantity}
              type="number"
              value={form.min_quantity}
              onChange={(e) =>
                setForm({ ...form, min_quantity: e.target.value })
              }
              placeholder="2"
              min="0"
              step="0.01"
            />
            <Input
              label={t.costPerUnit}
              type="number"
              value={form.cost_per_unit}
              onChange={(e) =>
                setForm({ ...form, cost_per_unit: e.target.value })
              }
              placeholder="50"
              min="0"
              step="0.01"
            />
          </div>

          <Input
            label={t.supplier}
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingItem(null);
                setForm(emptyForm);
              }}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              leftIcon={
                editingItem ? (
                  <Edit3 className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )
              }
            >
              {editingItem ? t.editItem : t.addItem}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
