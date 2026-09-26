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

/**
 * Get shop latitude safely from direct column or description tag.
 */
export function getShopLatitude(shop?: any): number | null {
  if (!shop) return null;
  if (typeof shop.latitude === "number" && !isNaN(shop.latitude)) return shop.latitude;
  if (typeof shop.latitude === "string") {
    const parsed = parseFloat(shop.latitude);
    if (!isNaN(parsed)) return parsed;
  }
  if (shop.description && shop.description.includes("__LAT__:")) {
    const match = shop.description.match(/__LAT__:([^\s_]+)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * Get shop longitude safely from direct column or description tag.
 */
export function getShopLongitude(shop?: any): number | null {
  if (!shop) return null;
  if (typeof shop.longitude === "number" && !isNaN(shop.longitude)) return shop.longitude;
  if (typeof shop.longitude === "string") {
    const parsed = parseFloat(shop.longitude);
    if (!isNaN(parsed)) return parsed;
  }
  if (shop.description && shop.description.includes("__LNG__:")) {
    const match = shop.description.match(/__LNG__:([^\s_]+)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * Clean internal metadata tags (coordinates, QR, UPI, Bank) from shop description before rendering on UI cards.
 */
export function cleanShopDescription(description?: string | null): string {
  if (!description) return "";
  return description
    .replace(/__LAT__:[^\s_]+/g, "")
    .replace(/__LNG__:[^\s_]+/g, "")
    .replace(/__PAYMENT_QR__:[^\s_]+/g, "")
    .replace(/__UPI_ID__:[^\s_]+/g, "")
    .replace(/__BANK_DETAILS__:[^\n_]+/g, "")
    .trim();
}

/**
 * Calculate geodesic distance between two points in meters using the Haversine formula.
 */
export function getHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance in meters or kilometers cleanly.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters * 10) / 10} m away`;
  }
  return `${(meters / 1000).toFixed(2)} km away`;
}

export interface DistanceCategoryInfo {
  label: "Closest" | "Nearby" | "Within Range";
  color: "blue" | "orange" | "green";
  badgeClass: string;
  dotClass: string;
}

/**
 * Get distance category info for 0-2 km (Blue/Closest), 2-5 km (Orange/Nearby), 5-10 km (Green/Within Range), or null (> 10 km).
 */
export function getDistanceCategory(meters: number): DistanceCategoryInfo | null {
  if (meters > 10000) return null; // Exclude > 10 km
  if (meters <= 2000) {
    return {
      label: "Closest",
      color: "blue",
      badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
      dotClass: "bg-blue-500",
    };
  }
  if (meters <= 5000) {
    return {
      label: "Nearby",
      color: "orange",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
      dotClass: "bg-amber-500",
    };
  }
  return {
    label: "Within Range",
    color: "green",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dotClass: "bg-emerald-500",
  };
}

/**
 * Check if a string already contains an emoji character.
 */
export function hasEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u;
  return emojiRegex.test(str);
}

/**
 * Intelligent Food & Beverage Emoji Mapper for Customer UI.
 * Returns an appropriate emoji for a food/beverage item name or category.
 */
export function getItemEmoji(name: string, category?: string): string {
  if (!name) return "";
  if (hasEmoji(name)) return ""; // Avoid duplicate emojis if already in name

  const nameLower = name.toLowerCase().trim();
  const catLower = (category || "").toLowerCase().trim();

  // 1. Hot Beverages: Tea, Coffee, Chai
  if (
    nameLower.includes("tea") ||
    nameLower.includes("chai") ||
    nameLower.includes("coffee") ||
    nameLower.includes("காபி") ||
    nameLower.includes("தேநீர்") ||
    nameLower.includes("cappuccino") ||
    nameLower.includes("latte") ||
    nameLower.includes("espresso")
  ) {
    return "☕";
  }

  // 2. Biryani & Fried Rice
  if (
    nameLower.includes("biriyani") ||
    nameLower.includes("biryani") ||
    nameLower.includes("பிரியாணி") ||
    nameLower.includes("pulao") ||
    nameLower.includes("fried rice")
  ) {
    return "🍛";
  }

  // 3. Rice, Idli, Pongal, Meals
  if (
    nameLower.includes("idli") ||
    nameLower.includes("இட்லி") ||
    nameLower.includes("pongal") ||
    nameLower.includes("பொங்கல்") ||
    nameLower.includes("rice") ||
    nameLower.includes("meals") ||
    nameLower.includes("thali") ||
    nameLower.includes("சாதம்")
  ) {
    return "🍚";
  }

  // 4. Dosa / Dosai / Uttapam
  if (
    nameLower.includes("dosa") ||
    nameLower.includes("dosai") ||
    nameLower.includes("தோசை") ||
    nameLower.includes("roast") ||
    nameLower.includes("uttapam") ||
    nameLower.includes("oothappam")
  ) {
    return "🥞";
  }

  // 5. Vada / Vadai
  if (
    nameLower.includes("vada") ||
    nameLower.includes("vadai") ||
    nameLower.includes("வடை")
  ) {
    return "🍩";
  }

  // 6. Samosa, Dumplings, Momos
  if (
    nameLower.includes("samosa") ||
    nameLower.includes("சமோசா") ||
    nameLower.includes("momo") ||
    nameLower.includes("dumpling")
  ) {
    return "🥟";
  }

  // 7. Breads: Parotta, Chapati, Naan, Poori, Roti
  if (
    nameLower.includes("parotta") ||
    nameLower.includes("porotta") ||
    nameLower.includes("பரோட்டா") ||
    nameLower.includes("chapati") ||
    nameLower.includes("chappathi") ||
    nameLower.includes("சப்பாத்தி") ||
    nameLower.includes("poori") ||
    nameLower.includes("puri") ||
    nameLower.includes("பூரி") ||
    nameLower.includes("roti") ||
    nameLower.includes("naan")
  ) {
    return "🫓";
  }

  // 8. Juice, Milkshakes, Smoothies, Lassi
  if (
    nameLower.includes("juice") ||
    nameLower.includes("shake") ||
    nameLower.includes("smoothie") ||
    nameLower.includes("lassi") ||
    nameLower.includes("ஜூஸ்") ||
    nameLower.includes("badam milk") ||
    nameLower.includes("rose milk")
  ) {
    return "🧃";
  }

  // 9. Cakes, Pastries, Cupcakes
  if (
    nameLower.includes("cake") ||
    nameLower.includes("கேக்") ||
    nameLower.includes("pastry") ||
    nameLower.includes("cupcake") ||
    nameLower.includes("brownie")
  ) {
    return "🍰";
  }

  // 10. Soft Drinks & Soda
  if (
    nameLower.includes("soda") ||
    nameLower.includes("soft drink") ||
    /\bcola\b/i.test(nameLower) ||
    nameLower.includes("coke") ||
    nameLower.includes("pepsi") ||
    nameLower.includes("sprite") ||
    nameLower.includes("7up") ||
    nameLower.includes("bovento")
  ) {
    return "🥤";
  }

  // 11. Water & Packaged Drinks
  if (
    nameLower.includes("water") ||
    nameLower.includes("தண்ணீர்") ||
    nameLower.includes("mineral water")
  ) {
    return "💧";
  }

  // 12. Ice Cream & Kulfi
  if (
    nameLower.includes("ice cream") ||
    nameLower.includes("icecream") ||
    nameLower.includes("ஐஸ்கிரீம்") ||
    nameLower.includes("sundae") ||
    nameLower.includes("kulfi") ||
    nameLower.includes("falooda")
  ) {
    return "🍦";
  }

  // 13. Noodles & Pasta
  if (
    nameLower.includes("noodle") ||
    nameLower.includes("chowmein") ||
    nameLower.includes("pasta") ||
    nameLower.includes("ramen") ||
    nameLower.includes("maggi")
  ) {
    return "🍜";
  }

  // 14. Burger
  if (nameLower.includes("burger")) {
    return "🍔";
  }

  // 15. Pizza
  if (nameLower.includes("pizza")) {
    return "🍕";
  }

  // 16. Sandwich & Toast
  if (
    nameLower.includes("sandwich") ||
    nameLower.includes("toast") ||
    nameLower.includes("bread")
  ) {
    return "🥪";
  }

  // 17. Soup
  if (nameLower.includes("soup")) {
    return "🥣";
  }

  // 18. Chicken & Meat
  if (
    nameLower.includes("chicken") ||
    nameLower.includes("சிக்கன்") ||
    nameLower.includes("mutton") ||
    nameLower.includes("kabab") ||
    nameLower.includes("tikka") ||
    nameLower.includes("tandoori") ||
    nameLower.includes("65")
  ) {
    return "🍗";
  }

  // 19. Fish & Seafood
  if (
    nameLower.includes("fish") ||
    nameLower.includes("மீன்") ||
    nameLower.includes("prawn") ||
    nameLower.includes("crab")
  ) {
    return "🐟";
  }

  // 20. Egg & Omelette
  if (
    nameLower.includes("egg") ||
    nameLower.includes("முட்டை") ||
    nameLower.includes("omelet") ||
    nameLower.includes("omelette")
  ) {
    return "🍳";
  }

  // 21. Sweets & Desserts
  if (
    nameLower.includes("sweet") ||
    nameLower.includes("laddu") ||
    nameLower.includes("halwa") ||
    nameLower.includes("gulab") ||
    nameLower.includes("jamun") ||
    nameLower.includes("இனிப்பு") ||
    nameLower.includes("jalebi")
  ) {
    return "🍬";
  }

  // 22. Category-level Fallback Matching
  if (catLower) {
    if (catLower.includes("beverage") || catLower.includes("drink") || catLower.includes("tea") || catLower.includes("coffee")) return "☕";
    if (catLower.includes("tiffin") || catLower.includes("breakfast")) return "🥞";
    if (catLower.includes("biryani") || catLower.includes("rice")) return "🍛";
    if (catLower.includes("bakery") || catLower.includes("cake") || catLower.includes("dessert")) return "🍰";
    if (catLower.includes("juice") || catLower.includes("shake")) return "🧃";
    if (catLower.includes("ice cream")) return "🍦";
    if (catLower.includes("snack") || catLower.includes("starter")) return "🥟";
  }

  // Subtle generic food fallback
  return "🍲";
}
