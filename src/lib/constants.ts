// ============================================
// BISHOP — Application Constants
// ============================================

export const APP_NAME = "BISHOP";
export const APP_DESCRIPTION = "Smart Bakery & Hotel Management";
export const APP_VERSION = "1.0.0";

/**
 * User roles in the system.
 */
export const ROLES = {
  SHOPKEEPER: "shopkeeper",
  EMPLOYEE: "employee",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

/**
 * Order statuses for kitchen/order management.
 */
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Payment methods supported.
 */
export const PAYMENT_METHODS = {
  CASH: "cash",
  UPI: "upi",
  CARD: "card",
  RAZORPAY: "razorpay",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

/**
 * Navigation items for the shopkeeper dashboard sidebar.
 */
export const DASHBOARD_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Orders", href: "/dashboard/orders", icon: "ShoppingBag" },
  { label: "Menu", href: "/dashboard/menu", icon: "UtensilsCrossed" },
  { label: "Items", href: "/dashboard/inventory", icon: "Package" },
  { label: "Employees", href: "/dashboard/employees", icon: "Users" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;
