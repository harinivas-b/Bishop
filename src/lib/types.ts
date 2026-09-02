// ============================================
// BISHOP — TypeScript Type Definitions
// ============================================

import type { UserRole, OrderStatus, PaymentMethod } from "./constants";

/**
 * User profile stored in the `profiles` table.
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  shop_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Shop / business entity.
 */
export interface Shop {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  currency: string;
  tax_rate: number;
  is_active: boolean;
  upi_id?: string;
  payment_qr_url?: string;
  bank_details?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Menu category.
 */
export interface Category {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Menu item / product.
 */
export interface MenuItem {
  id: string;
  shop_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Inventory item tracked in stock.
 */
export interface InventoryItem {
  id: string;
  shop_id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_per_unit: number;
  supplier?: string;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Customer order.
 */
export interface Order {
  id: string;
  shop_id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  table_number?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: PaymentMethod;
  payment_status: "pending" | "paid" | "refunded";
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Individual item within an order.
 */
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  notes?: string;
}

/**
 * Employee record.
 */
export interface Employee {
  id: string;
  shop_id: string;
  profile_id: string;
  role: string;
  salary?: number;
  joined_at: string;
  is_active: boolean;
  profile?: Profile;
}

/**
 * Task assigned to an employee.
 */
export interface EmployeeTask {
  id: string;
  shop_id: string;
  employee_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  created_at: string;
}

/**
 * Auth state managed by zustand.
 */
export interface AuthState {
  user: Profile | null;
  shop: Shop | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setShop: (shop: Shop | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}
