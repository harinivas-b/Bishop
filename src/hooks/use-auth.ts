"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { Profile, Shop } from "@/lib/types";

/**
 * Hook that initializes and manages the auth session.
 * Listens for Supabase auth state changes and syncs the user profile + shop.
 */
export function useAuth() {
  const { user, shop, isLoading, setUser, setShop, setLoading, reset } =
    useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Fetch user profile and shop data
    async function loadUserData(userId: string) {
      try {
        // Fetch profile and potential owned shop in parallel for speed
        const [profileRes, ownedShopRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("shops").select("*").eq("owner_id", userId).limit(1)
        ]);

        const profile = profileRes.data;
        let shopData = ownedShopRes.data?.[0];

        if (profile) {
          setUser(profile as Profile);

          // If they aren't the owner, fetch the shop by their linked shop_id
          if (!shopData && profile.shop_id) {
            const { data } = await supabase
              .from("shops")
              .select("*")
              .eq("id", profile.shop_id)
              .single();
            shopData = data;
          }
        }
          
        if (shopData) {
          setShop(shopData as Shop);

          // Auto-heal missing profile linkage for shop owners
          if (profile && shopData.owner_id === profile.id && profile.shop_id !== shopData.id) {
              supabase.from("profiles").update({ shop_id: shopData.id }).eq("id", profile.id).then();
          } else if (!profile) {
              // If profile is entirely missing but they own a shop, auto-create it
              const { data: authUser } = await supabase.auth.getUser();
              if (authUser.user) {
                const fallbackProfile = {
                  id: userId,
                  email: authUser.user.email || "",
                  full_name: authUser.user.user_metadata?.full_name || "Owner",
                  role: "shopkeeper",
                  shop_id: shopData.id
                };
                await supabase.from("profiles").upsert(fallbackProfile);
                setUser(fallbackProfile as Profile);
              }
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    }

    // Check initial session
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        loadUserData(authUser.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setShop, setLoading, reset]);

  return { user, shop, isLoading };
}
