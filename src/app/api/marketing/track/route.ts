import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const SESSION_COOKIE = "al_session_token";

type MarketingTrackPayload = {
  event?: string;
  email?: string;
  source?: string;
  customerType?: string;
  region?: string;
  payload?: Record<string, unknown>;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as MarketingTrackPayload | null;
  const event = typeof body?.event === "string" ? body.event.trim() : "";

  if (!event) {
    return NextResponse.json({ message: "Event is required." }, { status: 400 });
  }

  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: "Marketing backend is not configured." }, { status: 500 });
  }

  const upstreamUrl = new URL("/wp-json/aesthetics-link/v1/marketing/track", baseUrl);
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value?.trim();

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach marketing service." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

  if (!upstream.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Marketing track failed (${upstream.status}).`;
    return NextResponse.json({ message }, { status: upstream.status });
  }

  return NextResponse.json(payload ?? { ok: true }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
