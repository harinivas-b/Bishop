
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomerProfile {
  name: string;
  phone: string;
  locationAddress: string;
  latitude: number | null;
  longitude: number | null;
  locationEnabled: boolean;
  updatedAt: string;
}

interface CustomerState {
  customer: CustomerProfile | null;
  setCustomer: (customer: CustomerProfile) => void;
  clearCustomer: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customer: null,
      setCustomer: (customer) => set({ customer }),
      clearCustomer: () => set({ customer: null }),
    }),
    {
      name: "bishop_customer_store",
    }
  )
);
