"use client";

export type MarketingTrackInput = {
  event: string;
  email?: string;
  source?: string;
  customerType?: "retail" | "clinic" | "wholesale" | "guest" | "";
  region?: string;
  payload?: Record<string, unknown>;
};

export async function trackMarketingEvent(input: MarketingTrackInput): Promise<void> {
  if (!input.event || typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/marketing/track", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Tracking should never block UX flows.
  }
}
