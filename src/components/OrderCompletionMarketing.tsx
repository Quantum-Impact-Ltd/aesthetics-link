"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { trackMarketingEvent } from "@/lib/marketing/client";
import { resolveMarketingCustomerType, resolveMarketingRegion } from "@/lib/marketing/context";

type OrderCompletionMarketingProps = {
  orderId: number;
  orderNumber: string;
  itemCount: number;
  total: string;
  billingEmail?: string;
};

type StatusState = {
  tone: "success" | "error";
  message: string;
};

export default function OrderCompletionMarketing({
  orderId,
  orderNumber,
  itemCount,
  total,
  billingEmail = "",
}: OrderCompletionMarketingProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState(billingEmail || user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState | null>(null);

  const context = useMemo(
    () => ({
      customerType: resolveMarketingCustomerType(user),
      region: resolveMarketingRegion(
        user,
        typeof navigator !== "undefined" ? navigator.language : "",
      ),
    }),
    [user],
  );

  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [email, user?.email]);

  useEffect(() => {
    if (orderId <= 0) {
      return;
    }

    const trackingKey = `al_purchase_tracked_${orderId}`;
    try {
      if (window.sessionStorage.getItem(trackingKey)) {
        return;
      }
      window.sessionStorage.setItem(trackingKey, "1");
    } catch {
      // Ignore storage availability issues and continue tracking once.
    }

    void trackMarketingEvent({
      event: "purchased",
      email: billingEmail || user?.email || "",
      source: "order_confirmed",
      customerType: context.customerType,
      region: context.region,
      payload: {
        orderId,
        orderNumber,
        itemCount,
        total,
      },
    });
  }, [billingEmail, context.customerType, context.region, itemCount, orderId, orderNumber, total, user?.email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ tone: "error", message: "Please enter a valid email address." });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          source: "post_purchase",
          customerType: context.customerType,
          region: context.region,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to subscribe right now. Please try again.");
      }

      setStatus({
        tone: "success",
        message: payload?.message || "Subscribed. We will send you launch updates and offers.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to subscribe right now. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="order-receipt__section">
      <div className="order-receipt__kicker">Stay Updated</div>
      <p style={{ margin: "0.4rem 0 0.85rem" }}>
        Receive new launch alerts, wholesale promos, and skincare education by email.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}
      >
        <input
          type="email"
          value={email}
          onChange={(next) => setEmail(next.target.value)}
          placeholder="Email address"
          required
          style={{
            flex: "1 1 240px",
            minHeight: "2.6rem",
            borderRadius: "999px",
            border: "1px solid rgba(0,0,0,0.2)",
            padding: "0.55rem 0.9rem",
            background: "rgba(255,255,255,0.86)",
          }}
        />
        <button
          type="submit"
          className="order-receipt__action-link"
          style={{ minHeight: "2.6rem" }}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Join Newsletter"}
        </button>
      </form>
      {status ? (
        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: "0.65rem",
            color: status.tone === "success" ? "#2f6f44" : "#b04545",
          }}
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}

