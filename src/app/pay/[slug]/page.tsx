import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentCustomerPage from "./PaymentCustomerPage";
import type { Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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
      title: "Payment Page Not Found | BISHOP",
    };
  }

  return {
    title: `Pay ${shopName} | BISHOP Payment`,
    description: `Contactless UPI & digital payment for ${shopName}.`,
  };
}

export default async function PayPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const supabase = await createClient();
  const decodedSlug = decodeURIComponent(slug);

  let { data: shop, error: shopError } = await supabase
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

  if (shopError || !shop || shop.is_active === false) {
    notFound();
  }

  const initialAmount = typeof sParams.amount === "string" ? parseFloat(sParams.amount) || 0 : 0;
  const initialTable = typeof sParams.table === "string" ? sParams.table : "";

  return (
    <PaymentCustomerPage
      shop={shop as unknown as Shop}
      initialAmount={initialAmount}
      initialTable={initialTable}
    />
  );
}
