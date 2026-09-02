import { create } from "zustand";
import type { AuthState } from "@/lib/types";

/**
 * Global auth store using Zustand.
 * Manages the current user profile, shop, and loading state.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  shop: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setShop: (shop) => set({ shop }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, shop: null, isLoading: false }),
}));
