import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MenuCustomerPage from "./MenuCustomerPage";
import type { Category, MenuItem, Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const decodedSlug = decodeURIComponent(slug);
  
  let { data: shop } = await supabase
    .from("shops")
    .select("id, name, shop_name")
    .eq("id", decodedSlug)
    .maybeSingle();

  if (!shop) {
    const { data: fallbackShop } = await supabase
      .from("shops")
      .select("id, name, shop_name")
      .eq("slug", decodedSlug)
      .maybeSingle();
    shop = fallbackShop;
  }

  const shopName = shop?.name || shop?.shop_name || "Shop";

  if (!shop) {
    return {
      title: "Menu Not Found | BISHOP",
    };
  }

  return {
    title: `${shopName} Digital Menu | BISHOP`,
    description: `Browse the ${shopName} menu and place an order directly from your phone.`,
  };
}

export default async function MenuPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const decodedSlug = decodeURIComponent(slug);

  let { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", decodedSlug)
    .maybeSingle();

  if (!shop) {
    const { data: fallbackShop } = await supabase
      .from("shops")
      .select("*")
      .eq("slug", decodedSlug)
      .maybeSingle();
    shop = fallbackShop;
  }

  if (!shop) {
    notFound();
  }

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("*")
      .eq("shop_id", shop.id)
      .eq("is_available", true)
      .order("sort_order", { ascending: true }),
  ]);

  const categories = (categoriesRes.data as Category[]) || [];
  const menuItems = (itemsRes.data as MenuItem[]) || [];

  return (
    <MenuCustomerPage shop={shop as Shop} categories={categories} menuItems={menuItems} />
  );
}
