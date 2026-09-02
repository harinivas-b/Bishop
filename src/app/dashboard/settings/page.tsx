"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  User,
  Store,
  Save,
  MapPin,
  Phone,
  Mail,
  FileText,
  QrCode,
  Copy,
  ExternalLink,
  Printer,
  CreditCard,
  Upload,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Shop } from "@/lib/types";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";
import { useLanguageStore } from "@/stores/language-store";
import { getShopPaymentQr, getShopUpiId, getShopBankDetails } from "@/lib/utils";

export default function SettingsPage() {
  const { user, shop, setUser, setShop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].settingsPage;
  const [activeTab, setActiveTab] = useState<"profile" | "shop" | "qr" | "payment">("profile");
  const [isSaving, setIsSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
  });

  // Shop form
  const [shopForm, setShopForm] = useState({
    name: shop?.name || "",
    description: shop?.description || "",
    address: shop?.address || "",
    phone_number: shop?.phone || "",
    email: shop?.email || "",
    gst_number: shop?.gst_number || "",
    tax_rate: shop?.tax_rate?.toString() || "0",
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    upi_id: getShopUpiId(shop) || "",
    payment_qr_url: getShopPaymentQr(shop) || "",
    bank_details: getShopBankDetails(shop) || "",
  });

  useEffect(() => {
    if (shop) {
      setShopForm({
        name: shop.name || "",
        description: shop.description || "",
        address: shop.address || "",
        phone_number: shop.phone || "",
        email: shop.email || "",
        gst_number: shop.gst_number || "",
        tax_rate: shop.tax_rate?.toString() || "0",
      });
      setPaymentForm({
        upi_id: getShopUpiId(shop) || "",
        payment_qr_url: getShopPaymentQr(shop) || "",
        bank_details: getShopBankDetails(shop) || "",
      });
    }
  }, [shop]);

  const publicUrl = typeof window !== "undefined" && shop?.id ? `${window.location.origin}/menu/${shop.id}` : "";
  const publicMenuQrUrl = publicUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}` : "";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const supabase = createClient();
      
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
        }
      });
      
      if (authError) throw authError;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setUser({
        ...user,
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim() || undefined,
      } as Profile);

      toast.success("Profile updated");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveShop(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setIsSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("shops")
        .update({
          name: shopForm.name.trim(),
          description: shopForm.description.trim() || null,
          address: shopForm.address.trim() || null,
          phone: shopForm.phone_number.trim() || null,
          email: shopForm.email.trim() || null,
          gst_number: shopForm.gst_number.trim() || null,
          tax_rate: parseFloat(shopForm.tax_rate) || 0,
        })
        .eq("id", shop.id);

      if (error) throw error;

      setShop({
        ...shop,
        name: shopForm.name.trim(),
        description: shopForm.description.trim() || undefined,
        address: shopForm.address.trim() || undefined,
        phone: shopForm.phone_number.trim() || undefined,
        email: shopForm.email.trim() || undefined,
        gst_number: shopForm.gst_number.trim() || undefined,
        tax_rate: parseFloat(shopForm.tax_rate) || 0,
      } as Shop);

      toast.success("Shop settings updated");
    } catch (error: any) {
      console.error("Error updating shop settings:", error);
      toast.error("Failed to update shop settings");
    } finally {
      setIsSaving(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPaymentForm((prev) => ({ ...prev, payment_qr_url: dataUrl }));
      toast.success("Payment QR image loaded! Click Save to apply.");
    };
    reader.readAsDataURL(file);
  }

  async function savePaymentDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setIsSaving(true);

    try {
      const supabase = createClient();
      const upiVal = paymentForm.upi_id.trim();
      const qrVal = paymentForm.payment_qr_url.trim();
      const bankVal = paymentForm.bank_details.trim();

      // Try updating direct columns first
      const { error: directErr } = await supabase
        .from("shops")
        .update({
          upi_id: upiVal || null,
          payment_qr_url: qrVal || null,
          bank_details: bankVal || null,
        })
        .eq("id", shop.id);

      if (directErr && (directErr.code === "PGRST204" || directErr.message?.includes("column"))) {
        // Fallback storing tags safely in description field if columns not added yet
        let desc = shop.description || "";
        desc = desc
          .replace(/__PAYMENT_QR__:[^\s_]+/g, "")
          .replace(/__UPI_ID__:[^\s_]+/g, "")
          .replace(/__BANK_DETAILS__:[^\n_]+/g, "")
          .trim();

        if (qrVal) desc += ` __PAYMENT_QR__:${qrVal}`;
        if (upiVal) desc += ` __UPI_ID__:${upiVal}`;
        if (bankVal) desc += ` __BANK_DETAILS__:${bankVal}`;

        await supabase.from("shops").update({ description: desc }).eq("id", shop.id);
      }

      setShop({
        ...shop,
        upi_id: upiVal || undefined,
        payment_qr_url: qrVal || undefined,
        bank_details: bankVal || undefined,
      } as Shop);

      toast.success("Payment & Bank Details updated successfully!");
    } catch (error: any) {
      console.error("Error saving payment details:", error);
      toast.error(error?.message || "Failed to update payment details");
    } finally {
      setIsSaving(false);
    }
  }

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "shop" as const, label: "Shop", icon: Store },
    { id: "qr" as const, label: "QR Code", icon: QrCode },
    { id: "payment" as const, label: "Payment / Bank Details", icon: CreditCard },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t.desc}
        </p>
      </motion.div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key="profile"
        >
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-mint-500/20">
                  {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                  <p className="text-xs text-mint-600 font-medium capitalize mt-0.5">
                    {user?.role}
                  </p>
                </div>
              </div>

              <Input
                label="Full name"
                value={profileForm.full_name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, full_name: e.target.value })
                }
                leftIcon={<User className="h-4 w-4" />}
                required
              />

              <Input
                label="Phone number"
                type="tel"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
                leftIcon={<Phone className="h-4 w-4" />}
                placeholder="+91 98765 43210"
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  isLoading={isSaving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Shop Tab */}
      {activeTab === "shop" && shop && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key="shop"
        >
          <Card padding="lg">
            <CardHeader>
              <CardTitle>{t.shopDetails}</CardTitle>
            </CardHeader>
            <form onSubmit={saveShop} className="space-y-5">
              <Input
                label="Shop name"
                value={shopForm.name}
                onChange={(e) =>
                  setShopForm({ ...shopForm, name: e.target.value })
                }
                leftIcon={<Store className="h-4 w-4" />}
                required
              />

              <Textarea
                label="Description"
                value={shopForm.description}
                onChange={(e) =>
                  setShopForm({ ...shopForm, description: e.target.value })
                }
                placeholder="About your business..."
              />

              <Input
                label="Address"
                value={shopForm.address}
                onChange={(e) =>
                  setShopForm({ ...shopForm, address: e.target.value })
                }
                leftIcon={<MapPin className="h-4 w-4" />}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  type="tel"
                  value={shopForm.phone_number}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, phone_number: e.target.value })
                  }
                  leftIcon={<Phone className="h-4 w-4" />}
                />
                <Input
                  label="Email"
                  type="email"
                  value={shopForm.email}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, email: e.target.value })
                  }
                  leftIcon={<Mail className="h-4 w-4" />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="GST Number"
                  value={shopForm.gst_number}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, gst_number: e.target.value })
                  }
                  leftIcon={<FileText className="h-4 w-4" />}
                />
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  value={shopForm.tax_rate}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, tax_rate: e.target.value })
                  }
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  isLoading={isSaving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  {t.saveChanges}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* QR Code Tab */}
      {activeTab === "qr" && shop && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key="qr"
        >
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Customer Public Menu QR Code</CardTitle>
            </CardHeader>

            <div className="flex flex-col items-center justify-center p-6 text-center space-y-6">
              <div className="p-4 bg-white rounded-3xl border-2 border-mint-200 shadow-xl shadow-mint-500/10 inline-block">
                {publicMenuQrUrl ? (
                  <img
                    src={publicMenuQrUrl}
                    alt={`Scannable QR Menu for ${shop.name}`}
                    className="w-56 h-56 rounded-xl object-contain mx-auto"
                  />
                ) : (
                  <div className="h-56 w-56 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white p-4">
                    <QrCode className="h-28 w-28 text-mint-400 mb-2" />
                    <span className="text-xs font-bold tracking-widest uppercase">{shop.name}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">{shop.name} BISHOP QR Code</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Scan this QR code with any smartphone camera to open your shop's public digital menu.
                </p>
              </div>

              <div className="w-full max-w-md bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                <code className="text-xs text-mint-700 font-semibold truncate flex-1 pl-2">
                  {publicUrl || `bishop.app/menu/${shop.id}`}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (publicUrl) {
                      navigator.clipboard.writeText(publicUrl);
                      toast.success("Public menu link copied to clipboard");
                    }
                  }}
                  leftIcon={<Copy className="h-3.5 w-3.5" />}
                >
                  Copy
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <a href={`/menu/${shop.id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />}>
                    Open Menu
                  </Button>
                </a>
                <Button
                  variant="secondary"
                  leftIcon={<Printer className="h-4 w-4" />}
                  onClick={() => {
                    window.print();
                  }}
                >
                  Print QR Poster
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Payment / Bank Details Tab */}
      {activeTab === "payment" && shop && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key="payment"
        >
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Payment & Bank Details</CardTitle>
            </CardHeader>

            <form onSubmit={savePaymentDetails} className="space-y-6">
              <p className="text-sm text-slate-500">
                Upload your official UPI/Bank payment QR code image. This QR code will be displayed to customers on the payment page when paying for orders.
              </p>

              {/* Upload Payment QR Image Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Shop Payment QR Image (UPI / GPay / PhonePe / Paytm / Bank) *
                </label>

                <div className="border-2 border-dashed border-slate-200 hover:border-mint-400 rounded-3xl p-6 bg-slate-50 transition text-center space-y-4">
                  {paymentForm.payment_qr_url ? (
                    <div className="space-y-3">
                      <img
                        src={paymentForm.payment_qr_url}
                        alt="Shop Payment QR Code"
                        className="w-48 h-48 rounded-2xl object-contain border border-slate-200 bg-white p-2 shadow-md mx-auto"
                      />
                      <div className="flex items-center justify-center gap-2">
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition">
                            <Upload className="h-3.5 w-3.5 text-mint-600" />
                            Change QR Image
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                          onClick={() => {
                            setPaymentForm((prev) => ({ ...prev, payment_qr_url: "" }));
                            toast.info("Payment QR image removed");
                          }}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <div className="h-14 w-14 rounded-2xl bg-mint-50 border border-mint-200 flex items-center justify-center mx-auto text-mint-600 mb-2">
                        <Upload className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        Click to upload Payment QR image
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PNG, JPG, or WEBP up to 5MB (From PhonePe, GPay, Paytm, or Bank App)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* UPI ID Input */}
              <Input
                label="Shop UPI ID (Optional text format for easy copy)"
                placeholder="e.g. merchant@okaxis or 9876543210@paytm"
                value={paymentForm.upi_id}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, upi_id: e.target.value })
                }
                leftIcon={<QrCode className="h-4 w-4" />}
              />

              {/* Bank Details Input */}
              <Textarea
                label="Bank Account Details (Optional)"
                placeholder="e.g. Account Name: AK Mess&#10;Account No: 1234567890&#10;IFSC: HDFC0001234&#10;Branch: Coimbatore"
                value={paymentForm.bank_details}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, bank_details: e.target.value })
                }
                className="text-xs font-mono"
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  isLoading={isSaving}
                  className="bg-gradient-to-r from-mint-600 to-emerald-600 hover:from-mint-700 hover:to-emerald-700 text-white font-bold"
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Payment Details
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {activeTab === "shop" && !shop && (
        <Card padding="lg" className="text-center py-12">
          <Store className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No shop configured yet.</p>
          <a
            href="/shop/setup"
            className="text-mint-600 text-sm font-medium mt-2 inline-block hover:underline"
          >
            Set up your shop →
          </a>
        </Card>
      )}
    </div>
  );
}
