import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx for conditional class handling.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupee currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format a date with time.
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Generate a short unique ID.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Delay execution for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate a string to a given length with ellipsis.
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Get shop payment QR image URL safely from shop object.
 */
export function getShopPaymentQr(shop?: any): string | null {
  if (!shop) return null;
  if (shop.payment_qr_url) return shop.payment_qr_url;
  if (shop.description && shop.description.includes("__PAYMENT_QR__:")) {
    const match = shop.description.match(/__PAYMENT_QR__:([^\s_]+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get shop UPI ID safely from shop object.
 */
export function getShopUpiId(shop?: any): string | null {
  if (!shop) return null;
  if (shop.upi_id) return shop.upi_id;
  if (shop.description && shop.description.includes("__UPI_ID__:")) {
    const match = shop.description.match(/__UPI_ID__:([^\s_]+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get shop Bank Details safely from shop object.
 */
export function getShopBankDetails(shop?: any): string | null {
  if (!shop) return null;
  if (shop.bank_details) return shop.bank_details;
  if (shop.description && shop.description.includes("__BANK_DETAILS__:")) {
    const match = shop.description.match(/__BANK_DETAILS__:([^\n_]+)/);
    if (match) return match[1];
  }
  return null;
}

