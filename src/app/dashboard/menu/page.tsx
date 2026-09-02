"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "framer-motion";
import { Plus, Package, Tag, Edit3, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Category, MenuItem } from "@/lib/types";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";
import { useLanguageStore } from "@/stores/language-store";

const emptyCategory = { name: "", description: "" };
const emptyItem = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  is_available: true,
  is_veg: true,
};

export default function MenuPage() {
  const { shop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].menuPage;
  const tc = DASHBOARD_TRANSLATIONS[lang || "en"].common;
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!shop) return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("shop_id", shop.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("menu_items")
          .select("*")
          .eq("shop_id", shop.id)
          .order("sort_order", { ascending: true }),
      ]);

      if (categoriesRes.error || itemsRes.error) {
        throw categoriesRes.error || itemsRes.error;
      }

      setCategories((categoriesRes.data as Category[]) || []);
      setItems((itemsRes.data as MenuItem[]) || []);
    } catch (error) {
      console.error("Error fetching menu data:", error);
      toast.error("Failed to load menu data");
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!shop || !categoryForm.name.trim()) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .insert({
          shop_id: shop.id,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null,
          sort_order: categories.length,
        })
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) => [...prev, data as Category]);
      setCategoryForm(emptyCategory);
      toast.success("Category created");
    } catch (error) {
      console.error("Create category failed:", error);
      toast.error("Failed to create category");
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!shop || !itemForm.name.trim() || !itemForm.category_id) {
      toast.error("Name, price and category are required");
      return;
    }

    try {
      const supabase = createClient();
      const payload = {
        shop_id: shop.id,
        category_id: itemForm.category_id,
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        price: parseFloat(itemForm.price) || 0,
        is_available: itemForm.is_available,
        is_veg: itemForm.is_veg,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Menu item updated");
      } else {
        const { data, error } = await supabase
          .from("menu_items")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setItems((prev) => [...prev, data as MenuItem]);
        toast.success("Menu item added");
      }

      setEditingItem(null);
      setItemForm(emptyItem);
      fetchData();
    } catch (error) {
      console.error("Menu item save failed:", error);
      toast.error("Failed to save menu item");
    }
  }

  function editItem(item: MenuItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category_id: item.category_id,
      is_available: item.is_available,
      is_veg: item.is_veg !== false,
    });
  }

  async function deleteCategory(category: Category) {
    if (!confirm(`Delete category "${category.name}" and all its menu items?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      setItems((prev) => prev.filter((i) => i.category_id !== category.id));
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Remove ${item.name} from the menu?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Menu item removed");
    } catch (error) {
      console.error("Delete menu item failed:", error);
      toast.error("Failed to remove menu item");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t.desc}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md">
          <CardHeader>
            <CardTitle>{t.createCategory}</CardTitle>
          </CardHeader>
          <form onSubmit={addCategory} className="space-y-4">
            <Input
              label={t.categoryName}
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label={t.description}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <Button type="submit" size="sm">
              {t.addCategory}
            </Button>
          </form>
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{editingItem ? t.editMenuItem : t.addMenuItem}</CardTitle>
          </CardHeader>
          <form onSubmit={addItem} className="space-y-4">
            <Input
              label={t.name}
              value={itemForm.name}
              onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label={t.price}
              type="number"
              value={itemForm.price}
              onChange={(e) => setItemForm((prev) => ({ ...prev, price: e.target.value }))}
              required
            />
            <label className="block text-sm font-medium text-slate-700">
              {t.category}
            </label>
            <select
              value={itemForm.category_id}
              onChange={(e) => setItemForm((prev) => ({ ...prev, category_id: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500"
              required
            >
              <option value="">{t.selectCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Input
              label={t.description}
              value={itemForm.description}
              onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={itemForm.is_available}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, is_available: e.target.checked }))}
                  className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-slate-300 rounded"
                />
                <label htmlFor="is_available" className="text-sm font-medium text-slate-700">{t.available}</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_veg"
                  checked={itemForm.is_veg}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, is_veg: e.target.checked }))}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <label htmlFor="is_veg" className="text-sm font-medium text-slate-700">Vegetarian Item</label>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm">
                {editingItem ? t.saveItem : t.addItem}
              </Button>
              {editingItem && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setItemForm(emptyItem);
                  }}
                >
                  {t.cancel}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md">
          <CardHeader>
            <CardTitle>{t.categories}</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
              {tc.refresh}
            </Button>
          </CardHeader>
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500">{t.noCategories}</p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-slate-100 p-3 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{category.name}</p>
                    <p className="text-xs text-slate-500">{category.description || t.noDescription}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge>{items.filter((item) => item.category_id === category.id).length}</Badge>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.menuItems}</CardTitle>
          </CardHeader>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">{t.noItems}</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-100 p-4 bg-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-sm text-slate-500 truncate">{item.description || t.noDescription}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.is_available ? "success" : "danger"}>
                        {item.is_available ? t.available : t.hidden}
                      </Badge>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {item.price.toLocaleString("en-IN", { style: "currency", currency: shop?.currency || "INR" })}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => editItem(item)}>
                      <Edit3 className="h-4 w-4" /> {t.edit}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => deleteItem(item)}>
                      <Trash2 className="h-4 w-4" /> {t.remove}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
