"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Entitlement } from "@/lib/payments/entitlements";
import { ACCESS_PASS } from "@/lib/payments/config";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { CheckCircle2, Star, CreditCard, ArrowRight, Clock } from "lucide-react";
import { APP_NAME } from "@/config/app";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (response: Record<string, unknown>) => void) => void;
    };
  }
}

export default function BillingPage() {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [pass, setPass] = useState(ACCESS_PASS);

  useEffect(() => {
    loadEntitlement();
  }, []);

  async function loadEntitlement() {
    setLoading(true);
    try {
      const resp = await fetch("/api/payments/entitlement");
      const ent = await resp.json();
      if (!resp.ok) throw new Error(ent.error || "Billing could not be loaded.");
      setEntitlement(ent);
      setCheckoutEnabled(ent.checkoutEnabled);
      setPass(ent.pass);
    } catch (error) {
      setCheckoutEnabled(false);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Billing is unavailable.",
      });
    }
    setLoading(false);
  }

  const handlePurchase = useCallback(async () => {
    setPurchasing(true);
    setMessage(null);

    try {
      const { createClient } = await import("@/lib/db/client");
      const {
        data: { user },
      } = await createClient().auth.getUser();
      const { trackEvent } = await import("@/lib/analytics");
      if (user) await trackEvent(user.id, "checkout_started");

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Checkout could not be loaded."));
          document.head.appendChild(script);
        });
      }

      const orderResp = await fetch("/api/payments/create-order", { method: "POST" });
      if (!orderResp.ok) {
        const data = await orderResp.json();
        setMessage({ type: "error", text: data.error || "Failed to create payment order." });
        setPurchasing(false);
        return;
      }

      const orderData = await orderResp.json();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: APP_NAME,
        description: ACCESS_PASS.description,
        order_id: orderData.orderId,
        handler: async (response: Record<string, unknown>) => {
          try {
            const verifyResp = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            if (verifyResp.ok) {
              setMessage({
                type: "success",
                text: "Payment successful! Your access pass is now active.",
              });
              loadEntitlement();
              if (user) await trackEvent(user.id, "payment_confirmed");
            } else {
              const data = await verifyResp.json();
              setMessage({ type: "error", text: data.error || "Payment verification failed." });
            }
          } catch {
            setMessage({ type: "error", text: "Payment verification failed. Contact support." });
          }
          setPurchasing(false);
        },
        prefill: {},
        theme: { color: "#58CC02" },
        modal: {
          ondismiss: () => {
            setPurchasing(false);
            setMessage({ type: "error", text: "Payment was cancelled." });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response: Record<string, unknown>) => {
        const error = response.error as Record<string, string> | undefined;
        setMessage({ type: "error", text: error?.description || "Payment failed." });
        setPurchasing(false);
      });
      razorpay.open();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Payment failed." });
      setPurchasing(false);
    }
  }, []);

  if (loading) return <PageLoader />;

  if (!entitlement) {
    return (
      <div className="page-frame max-w-2xl mx-auto space-y-5">
        <h1 className="text-2xl font-black text-[var(--ink)]">Billing</h1>
        <p role="alert" className="alert alert-error font-bold">
          {message?.text || "Billing verification is unavailable."} Your plan has not been verified.
        </p>
        <button className="btn btn-primary font-black" onClick={() => void loadEntitlement()}>
          Retry Verification
        </button>
      </div>
    );
  }

  const ent = entitlement;
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pass.currency,
  }).format(pass.amount / 100);

  return (
    <div className="page-frame max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF4D9] border-2 border-[#FFB020] flex items-center justify-center text-[#8A5200] shadow-[0_3px_0_#E59800]">
          <Star className="w-6 h-6 fill-[#FFB020] text-[#FFB020]" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--ink)]">Billing & Access</h1>
          <p className="text-xs font-semibold text-[var(--ink-muted)]">
            Simple, honest pricing. No auto-renewing subscriptions.
          </p>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={`p-4 rounded-2xl text-xs font-black flex items-center gap-2 border-2 ${
            message.type === "error"
              ? "bg-[#FFE5E5] border-[#D93B3B] text-[#991B1B]"
              : "bg-[#EEFFD9] border-[#58CC02] text-[#287300]"
          }`}
        >
          {message.type === "error" ? (
            <CreditCard className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current Plan Status Card */}
      <section className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">Current Plan</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black border-2 ${
              ent.hasActivePass
                ? "bg-[#EEFFD9] border-[#58CC02] text-[#287300]"
                : "bg-[#F7F9FA] border-[var(--border)] text-[var(--ink)]"
            }`}
          >
            {ent.hasActivePass ? "Active Access Pass" : "Free Account"}
          </span>
        </div>

        {ent.passExpiresAt && (
          <p className="text-xs font-bold text-[#287300] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#58CC02]" />
            <span>Pass expires on {new Date(ent.passExpiresAt).toLocaleDateString()}</span>
          </p>
        )}

        <p className="text-xs font-semibold text-[var(--ink-muted)] leading-relaxed">
          Profile storage, catalogue browsing, eligibility checks, saved opportunities, weekly email shortlists, and deadline reminders are completely free.
        </p>
      </section>

      {/* Upgrade / Access Pass Card */}
      <section className="bg-white border-2 border-[#58CC02] rounded-3xl p-6 sm:p-8 shadow-[0_6px_0_#46A302] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-[#EEFFD9] text-[#287300] border-2 border-[#58CC02] mb-2">
              POWER ACCESS PASS
            </span>
            <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
              {price} <span className="text-sm font-bold text-[var(--ink-muted)]">/ {pass.durationDays} days</span>
            </h2>
          </div>
          <div className="text-xs font-black text-[#0B72A4] bg-[#DDF4FF] border-2 border-[#1CB0F6] px-3 py-1.5 rounded-xl self-start sm:self-auto">
            One-time payment • No renewal
          </div>
        </div>

        <ul className="space-y-3 text-xs font-bold text-[var(--ink)]">
          <li className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#58CC02] shrink-0" strokeWidth={2.5} />
            <span>Daily personalized shortlists delivered to your inbox</span>
          </li>
          <li className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#58CC02] shrink-0" strokeWidth={2.5} />
            <span>Continuous background monitoring on your saved queries</span>
          </li>
          <li className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#58CC02] shrink-0" strokeWidth={2.5} />
            <span>Priority matching across the entire verified catalogue</span>
          </li>
          <li className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#58CC02] shrink-0" strokeWidth={2.5} />
            <span>Reverts automatically to free weekly schedule with zero hassle</span>
          </li>
        </ul>

        {checkoutEnabled ? (
          <button
            className="btn btn-primary w-full py-3.5 text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
            disabled={purchasing}
            onClick={handlePurchase}
          >
            <span>{purchasing ? "Opening checkout…" : `Get ${pass.durationDays}-Day Pass — ${price}`}</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#F7F9FA] border-2 border-[var(--border)] text-xs font-semibold text-[var(--ink-muted)] text-center">
            Paid access is currently in invitation testing. You can keep using all free features.
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-bold text-[var(--ink-muted)] pt-2 border-t-2 border-[var(--border)]">
          <Link href="/refund" className="hover:text-[var(--ink)] underline">
            Refund policy
          </Link>
          <Link href="/settings" className="hover:text-[var(--ink)]">
            Manage email preferences →
          </Link>
        </div>
      </section>
    </div>
  );
}
