import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

type SubscribePayload = {
  email?: string;
  source?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as SubscribePayload | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const source = typeof body?.source === "string" ? body.source.trim() : "footer";

  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: "Newsletter backend is not configured." }, { status: 500 });
  }

  const upstreamUrl = new URL("/wp-json/aesthetics-link/v1/newsletter/subscribe", baseUrl);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, source }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach newsletter service." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

  if (!upstream.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Newsletter request failed (${upstream.status}).`;
    return NextResponse.json({ message }, { status: upstream.status });
  }

  return NextResponse.json(payload ?? { ok: true }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
