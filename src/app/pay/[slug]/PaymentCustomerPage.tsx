"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  Building2,
  QrCode,
  Languages,
} from "lucide-react";
import type { Shop } from "@/lib/types";
import { formatCurrency, getShopPaymentQr, getShopUpiId, getShopBankDetails } from "@/lib/utils";
import { useLanguageStore } from "@/stores/language-store";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";

interface PaymentCustomerPageProps {
  shop: Shop;
  initialAmount: number;
  initialTable: string;
}

interface DraftCartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function PaymentCustomerPage({
  shop,
  initialAmount,
  initialTable,
}: PaymentCustomerPageProps) {
  const { lang, toggleLang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].customerPaymentPage;
  const menuT = DASHBOARD_TRANSLATIONS[lang || "en"].customerMenuPage;
  const tc = DASHBOARD_TRANSLATIONS[lang || "en"].common;

  const [amount, setAmount] = useState<number>(initialAmount > 0 ? initialAmount : 0);
  const [tableNumber, setTableNumber] = useState<string>(initialTable || "");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [cartItems, setCartItems] = useState<DraftCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash" | "razorpay">("upi");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    orderNumber: string;
    amount: number;
    tableNumber: string;
    method: string;
  } | null>(null);

  // Check if Razorpay is configured in environment
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const isRazorpayAvailable = Boolean(
    razorpayKey &&
      razorpayKey !== "your_razorpay_key_id_here" &&
      razorpayKey.length > 5
  );

  // Get Shop Payment Details from shop object
  const shopName = shop.name || "Shop";
  const uploadedPaymentQr = getShopPaymentQr(shop);
  const upiId = getShopUpiId(shop);
  const bankDetails = getShopBankDetails(shop);

  // Load draft cart from localStorage if available
  useEffect(() => {
    if (typeof window === "undefined") return;
    const draftKey = `bishop_checkout_${shop.id}`;
    const rawData = window.localStorage.getItem(draftKey);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed.total && (!initialAmount || initialAmount === 0)) {
          setAmount(parsed.total);
        }
        if (parsed.tableNumber && !initialTable) {
          setTableNumber(parsed.tableNumber);
        }
        if (parsed.customerName) setCustomerName(parsed.customerName);
        if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
        if (Array.isArray(parsed.cart)) {
          setCartItems(
            parsed.cart.map((item: any) => ({
              menu_item_id: item.menu_item_id || item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              notes: item.notes || "",
            }))
          );
        }
      } catch (err) {
        console.error("Error parsing checkout draft:", err);
      }
    }
  }, [shop.id, initialAmount, initialTable]);

  function copyUpiId() {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied to clipboard!");
  }

  function copyBankDetails() {
    if (!bankDetails) return;
    navigator.clipboard.writeText(bankDetails);
    toast.success("Bank details copied to clipboard!");
  }

  // Load Razorpay script dynamically if needed
  useEffect(() => {
    if (!isRazorpayAvailable) return;
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isRazorpayAvailable]);

  async function handleRazorpayPayment() {
    if (!isRazorpayAvailable || !razorpayKey) {
      toast.error("Razorpay is not configured.");
      return;
    }

    if (amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);

    const options = {
      key: razorpayKey,
      amount: Math.round(amount * 100), // in paise
      currency: "INR",
      name: shopName,
      description: `Payment for Table ${tableNumber || "Takeaway"}`,
      handler: async function (response: any) {
        toast.success(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
        await recordOrder("paid", "razorpay");
      },
      prefill: {
        name: customerName,
        contact: customerPhone,
      },
      theme: {
        color: "#10b981",
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay error:", err);
      toast.error("Failed to initialize Razorpay checkout.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function recordOrder(status: "paid" | "pending", method: string) {
    setIsSubmitting(true);
    const supabase = createClient();
    const orderNum = `BISHOP-${Math.floor(Date.now() / 1000).toString().slice(-4)}-${Math.floor(
      Math.random() * 900 + 100
    )}`;

    try {
      if (cartItems.length > 0) {
        // Submit with items via RPC
        const { error: rpcError } = await supabase.rpc("submit_customer_order", {
          p_shop_id: shop.id,
          p_table_number: tableNumber.trim() || "Table QR",
          p_customer_name: customerName.trim() || null,
          p_customer_phone: customerPhone.trim() || null,
          p_payment_method: method,
          p_notes: `QR Payment via ${method.toUpperCase()}`,
          p_items: cartItems,
        });

        if (rpcError) {
          console.warn("RPC failed, inserting order directly:", rpcError);
          // Direct fallback insert
          const { error: directErr } = await supabase
            .from("orders")
            .insert({
              shop_id: shop.id,
              order_number: orderNum,
              customer_name: customerName.trim() || null,
              customer_phone: customerPhone.trim() || null,
              table_number: tableNumber.trim() || "Table QR",
              status: "pending",
              subtotal: amount,
              tax: 0,
              total: amount,
              payment_method: method,
              payment_status: status,
              notes: `QR Payment via ${method.toUpperCase()}`,
            });

          if (directErr) throw directErr;
        }
      } else {
        // Direct payment record without menu items
        const { error: directErr } = await supabase.from("orders").insert({
          shop_id: shop.id,
          order_number: orderNum,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          table_number: tableNumber.trim() || "Counter",
          status: "pending",
          subtotal: amount,
          tax: 0,
          total: amount,
          payment_method: method,
          payment_status: status,
          notes: `Direct QR Payment via ${method.toUpperCase()}`,
        });

        if (directErr) throw directErr;
      }

      // Clear draft cart
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`bishop_checkout_${shop.id}`);
      }

      setPaymentSuccess({
        orderNumber: orderNum,
        amount,
        tableNumber: tableNumber || "Table QR",
        method,
      });
      toast.success("Payment recorded successfully!");
    } catch (err: any) {
      console.error("Payment submission error:", err);
      toast.error(err?.message || "Error submitting payment. Please alert shop staff.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success View
  if (paymentSuccess) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4">
        <Card padding="lg" className="w-full max-w-md text-center rounded-3xl space-y-6 shadow-xl border-slate-200">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <Badge variant="mint" className="mb-2">
              {paymentSuccess.tableNumber}
            </Badge>
            <h1 className="text-2xl font-black text-slate-900">Payment Confirmed!</h1>
            <p className="text-sm text-slate-500 mt-1">Thank you for your payment to {shopName}.</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Reference</span>
              <span className="font-bold text-slate-900">{paymentSuccess.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shop</span>
              <span className="font-semibold text-slate-900">{shopName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode</span>
              <span className="font-bold text-mint-700 uppercase">{paymentSuccess.method}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-base">
              <span>Amount Paid</span>
              <span>{formatCurrency(paymentSuccess.amount)}</span>
            </div>
          </div>

          <a href={`/menu/${shop.id}`} className="block">
            <Button size="lg" className="w-full">
              Return to Menu
            </Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 py-6 sm:py-10">
      <div className="max-w-xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <a
            href={`/menu/${shop.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backToMenu}
          </a>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleLang}
              className="border-mint-200 text-mint-700 hover:bg-mint-50 hover:text-mint-800"
              leftIcon={<Languages className="h-4 w-4" />}
            >
              {lang === "en" ? "தமிழ்" : "English"}
            </Button>
            <Badge variant="mint" className="text-xs uppercase tracking-wider font-bold">
              BISHOP Pay
            </Badge>
          </div>
        </div>

        {/* Shop Info Card */}
        <Card padding="md" className="rounded-3xl border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-mint-50 border border-mint-100 flex items-center justify-center text-mint-600 font-black text-xl shrink-0">
              {shopName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{shopName}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{shop.address || "Contactless Digital Payment"}</p>
            </div>
          </div>
        </Card>

        {/* Payment Main Container */}
        <Card padding="lg" className="rounded-3xl border-slate-200 shadow-md space-y-6">
          {/* Amount Display / Edit */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Payment Amount
            </label>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-black text-slate-800">₹</span>
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="1"
                className="text-3xl font-black text-slate-900 w-36 text-center bg-transparent focus:outline-none focus:border-b-2 focus:border-mint-500"
              />
            </div>
            {tableNumber && (
              <Badge variant="mint" className="mt-1">
                Table / Room: {tableNumber}
              </Badge>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Select Payment Option
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`p-4 rounded-2xl border flex items-center sm:flex-col justify-center gap-3 transition touch-manipulation ${
                  paymentMethod === "upi"
                    ? "border-mint-500 bg-mint-50/50 text-mint-700 shadow-sm font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <Smartphone className="h-6 w-6 text-mint-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">UPI / Shop QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-4 rounded-2xl border flex items-center sm:flex-col justify-center gap-3 transition touch-manipulation ${
                  paymentMethod === "cash"
                    ? "border-mint-500 bg-mint-50/50 text-mint-700 shadow-sm font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <Banknote className="h-6 w-6 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Cash at Counter</span>
              </button>

              {isRazorpayAvailable && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("razorpay")}
                  className={`p-4 rounded-2xl border flex items-center sm:flex-col justify-center gap-3 sm:col-span-2 transition touch-manipulation ${
                    paymentMethod === "razorpay"
                      ? "border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm font-bold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <CreditCard className="h-6 w-6 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Online / Card / Razorpay
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Shop Uploaded Payment QR Content */}
          {paymentMethod === "upi" && (
            <div className="space-y-5 pt-2 border-t border-slate-100">
              {uploadedPaymentQr ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Scan to Pay</h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto">
                      Scan this QR code using GPay, PhonePe, Paytm, BHIM, or any UPI app.
                    </p>
                  </div>

                  {/* Uploaded Shop Payment QR Image */}
                  <div className="p-4 bg-white rounded-3xl border-2 border-mint-200 shadow-xl shadow-mint-500/10 inline-block w-full max-w-[260px]">
                    <img
                      src={uploadedPaymentQr}
                      alt={`Payment QR Code for ${shopName}`}
                      className="w-full h-auto aspect-square rounded-2xl object-contain mx-auto border border-slate-100 bg-white p-1"
                    />
                  </div>

                  {/* Shop UPI ID + Copy Option */}
                  {upiId && (
                    <div className="w-full max-w-sm bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="truncate text-left pl-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Shop UPI ID
                        </span>
                        <code className="text-xs font-bold text-mint-700 truncate block">
                          {upiId}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyUpiId}
                        leftIcon={<Copy className="h-3.5 w-3.5" />}
                      >
                        Copy UPI ID
                      </Button>
                    </div>
                  )}

                  {/* Bank Details Display */}
                  {bankDetails && (
                    <div className="w-full max-w-sm bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-500" />
                          Bank Account Details
                        </span>
                        <button
                          type="button"
                          onClick={copyBankDetails}
                          className="text-[11px] font-bold text-mint-600 hover:underline flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                        {bankDetails}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                /* Clear Alert when no payment QR configured (Requirement 8) */
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
                  <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                  <div>
                    <h3 className="text-base font-extrabold text-amber-900">
                      Payment QR not configured by this shop.
                    </h3>
                    <p className="text-xs text-amber-700 mt-1">
                      {shopName} has not uploaded their payment QR image yet. Please pay cash at the counter or contact shop staff.
                    </p>
                  </div>

                  {upiId && (
                    <div className="bg-white p-3 rounded-xl border border-amber-200 text-left flex items-center justify-between gap-2 mt-2">
                      <div className="truncate">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">UPI ID</span>
                        <code className="text-xs font-bold text-slate-900">{upiId}</code>
                      </div>
                      <Button size="sm" variant="outline" onClick={copyUpiId} leftIcon={<Copy className="h-3.5 w-3.5" />}>
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm UPI Payment Button */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <Button
                  onClick={() => recordOrder("paid", "upi")}
                  disabled={isSubmitting || amount <= 0}
                  className="w-full bg-gradient-to-r from-mint-600 to-emerald-600 hover:from-mint-700 hover:to-emerald-700 text-white font-extrabold py-3 shadow-lg shadow-mint-500/20"
                  size="lg"
                  leftIcon={<CheckCircle2 className="h-5 w-5" />}
                >
                  I Have Paid {amount > 0 ? formatCurrency(amount) : ""} via QR / UPI
                </Button>
              </div>
            </div>
          )}

          {/* Cash Payment Content */}
          {paymentMethod === "cash" && (
            <div className="space-y-4 pt-2 border-t border-slate-100 text-center">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-900 space-y-2">
                <Banknote className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold">Pay Cash at Counter</p>
                <p className="text-xs text-emerald-700">
                  Please hand over {formatCurrency(amount)} in cash to the cashier at {shopName}.
                </p>
              </div>

              <Button
                onClick={() => recordOrder("pending", "cash")}
                disabled={isSubmitting || amount <= 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 shadow-md"
                size="lg"
                leftIcon={<CheckCircle2 className="h-5 w-5" />}
              >
                Confirm Cash Order ({formatCurrency(amount)})
              </Button>
            </div>
          )}

          {/* Razorpay Online Content */}
          {paymentMethod === "razorpay" && isRazorpayAvailable && (
            <div className="space-y-4 pt-2 border-t border-slate-100 text-center">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-900 space-y-2">
                <ShieldCheck className="h-8 w-8 text-blue-600 mx-auto" />
                <p className="text-sm font-bold">Secure Online Checkout</p>
                <p className="text-xs text-blue-700">
                  Pay via Credit/Debit Cards, NetBanking, or Digital Wallets powered by Razorpay.
                </p>
              </div>

              <Button
                onClick={handleRazorpayPayment}
                disabled={isSubmitting || amount <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 shadow-md"
                size="lg"
                leftIcon={<CreditCard className="h-5 w-5" />}
              >
                Pay {formatCurrency(amount)} with Razorpay
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
