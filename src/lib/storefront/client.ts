"use client";

import type {
  StorefrontCart,
  StorefrontCheckoutPayload,
  StorefrontCheckoutResponse,
} from "@/lib/storefront/types";

// ── Raw Store API types ────────────────────────────────────────────────────

type RawPrice = {
  currency_symbol?: string;
  currency_prefix?: string;
  currency_suffix?: string;
  currency_minor_unit?: number;
  price?: string;
};

type RawTotals = {
  currency_symbol?: string;
  currency_prefix?: string;
  currency_suffix?: string;
  currency_minor_unit?: number;
  total_items?: string;
  total_shipping?: string;
  total_tax?: string;
  total_price?: string;
};

type RawCartItem = {
  key: string;
  id?: number;
  slug?: string;
  name?: string;
  quantity?: number;
  images?: Array<{ src?: string; alt?: string }>;
  variation?: unknown;
  prices?: RawPrice;
  totals?: {
    line_total?: string;
  };
};

type RawCart = {
  items?: RawCartItem[];
  items_count?: number;
  needs_shipping?: boolean;
  totals?: RawTotals;
};

// ── Utilities ──────────────────────────────────────────────────────────────

const ACCENT_COLORS = ["#F1CCCF", "#D8D0C4", "#D3E5EF", "#E8DFC8"];

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&pound;/g, "£")
    .replace(/&dollar;/g, "$")
    .replace(/&euro;/g, "€");
}

function formatMoney(rawValue: string | undefined, money: Partial<RawPrice & RawTotals>): string {
  const minorUnits = Number.isFinite(money.currency_minor_unit)
    ? Number(money.currency_minor_unit)
    : 2;
  const numeric = Number(rawValue ?? "0");
  const amount = Number.isFinite(numeric)
    ? String(rawValue ?? "").includes(".")
      ? numeric
      : numeric / 10 ** minorUnits
    : 0;
  const symbol = decodeEntities(money.currency_prefix ?? money.currency_symbol ?? "$");
  const suffix = decodeEntities(money.currency_suffix ?? "");
  return `${symbol}${amount.toFixed(minorUnits)}${suffix}`;
}

function normalizeStoreErrorMessage(value: string): string {
  const normalized = decodeEntities(value).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Store API request failed.";
  }

  if (/out of stock|insufficient stock|not enough stock|cannot add/i.test(normalized)) {
    return "This product is out of stock and cannot be added to your bag.";
  }

  if (/missing attributes|choose product options|select options|please choose/i.test(normalized)) {
    return "Please select all required product options before adding to bag.";
  }

  return normalized;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function humanizeVariationLabel(value: string): string {
  const cleaned = decodeEntities(value)
    .trim()
    .replace(/^attribute_/, "")
    .replace(/^pa_/, "")
    .replace(/[_-]+/g, " ");
  return cleaned ? cleaned.replace(/\b\w/g, (match) => match.toUpperCase()) : "Option";
}

function normalizeVariationValue(value: string): string {
  return decodeEntities(value).trim().toLowerCase();
}

function parseCartItemVariations(input: unknown): Array<{ label: string; value: string }> {
  const parsed: Array<{ label: string; value: string }> = [];

  if (Array.isArray(input)) {
    for (const entryRaw of input) {
      const entry = asRecord(entryRaw);
      if (!entry) {
        continue;
      }

      const labelRaw =
        (typeof entry.attribute_name === "string" && entry.attribute_name.trim()) ||
        (typeof entry.name === "string" && entry.name.trim()) ||
        (typeof entry.attribute === "string" && entry.attribute.trim()) ||
        (typeof entry.key === "string" && entry.key.trim()) ||
        "";
      const valueRaw =
        (typeof entry.value === "string" && entry.value.trim()) ||
        (typeof entry.option === "string" && entry.option.trim()) ||
        (typeof entry.display === "string" && entry.display.trim()) ||
        "";

      if (!labelRaw || !valueRaw) {
        continue;
      }

      parsed.push({
        label: humanizeVariationLabel(labelRaw),
        value: decodeEntities(valueRaw).trim(),
      });
    }
  } else {
    const variationObject = asRecord(input);
    if (!variationObject) {
      return parsed;
    }

    for (const [rawKey, rawValue] of Object.entries(variationObject)) {
      if (typeof rawValue !== "string" || !rawValue.trim()) {
        continue;
      }

      parsed.push({
        label: humanizeVariationLabel(rawKey),
        value: decodeEntities(rawValue).trim(),
      });
    }
  }

  const deduped = new Map<string, { label: string; value: string }>();
  for (const entry of parsed) {
    const dedupeKey = `${normalizeVariationValue(entry.label)}::${normalizeVariationValue(entry.value)}`;
    if (deduped.has(dedupeKey)) {
      continue;
    }
    deduped.set(dedupeKey, entry);
  }

  return Array.from(deduped.values());
}

// ── Store API client ───────────────────────────────────────────────────────

async function requestStoreApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/woo${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload &&
      "message" in payload &&
      typeof (payload as { message?: string }).message === "string"
        ? normalizeStoreErrorMessage((payload as { message: string }).message)
        : `Store API request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function mapRawCart(rawCart: RawCart): StorefrontCart {
  const totals = rawCart.totals ?? {};
  const items = (rawCart.items ?? []).map((item, index) => {
    const priceContext = item.prices ?? totals;
    const name = item.name ?? "Product";
    return {
      key: item.key,
      productId: item.id ?? 0,
      slug: item.slug ?? `item-${item.key}`,
      name,
      shortName: name,
      quantity: item.quantity ?? 1,
      price: formatMoney(item.prices?.price, priceContext),
      lineTotal: formatMoney(item.totals?.line_total ?? item.prices?.price, priceContext),
      variations: parseCartItemVariations(item.variation),
      image: item.images?.[0]?.src ?? "/images/offer.jpg",
      imageAlt: item.images?.[0]?.alt ?? name,
      accentBg: ACCENT_COLORS[index % ACCENT_COLORS.length],
    };
  });

  return {
    items,
    itemCount: rawCart.items_count ?? items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: formatMoney(totals.total_items, totals),
    shipping: formatMoney(totals.total_shipping, totals),
    tax: formatMoney(totals.total_tax, totals),
    total: formatMoney(totals.total_price, totals),
    currencySymbol: decodeEntities(totals.currency_prefix ?? totals.currency_symbol ?? "$"),
    needsShipping: Boolean(rawCart.needs_shipping),
  };
}

// ── Cart operations ────────────────────────────────────────────────────────

export async function fetchCart(): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart");
  return mapRawCart(raw);
}

export async function addCartItem(productId: number, quantity = 1): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart/add-item", {
    method: "POST",
    body: JSON.stringify({ id: productId, quantity }),
  });
  return mapRawCart(raw);
}

export async function addVariableCartItem(
  productId: number,
  variation: Array<{ attribute: string; value: string }>,
  quantity = 1,
): Promise<StorefrontCart> {
  const sanitizedVariation = variation
    .map((entry) => ({
      attribute: entry.attribute.trim(),
      value: entry.value.trim(),
    }))
    .filter((entry) => entry.attribute && entry.value);

  const raw = await requestStoreApi<RawCart>("/cart/add-item", {
    method: "POST",
    body: JSON.stringify({
      id: productId,
      quantity,
      ...(sanitizedVariation.length > 0 ? { variation: sanitizedVariation } : {}),
    }),
  });
  return mapRawCart(raw);
}

export async function updateCartItemQuantity(key: string, quantity: number): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart/update-item", {
    method: "POST",
    body: JSON.stringify({ key, quantity }),
  });
  return mapRawCart(raw);
}

export async function removeCartItem(key: string): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart/remove-item", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  return mapRawCart(raw);
}

export async function submitCheckout(
  payload: StorefrontCheckoutPayload,
): Promise<StorefrontCheckoutResponse> {
  const raw = await requestStoreApi<Record<string, unknown>>("/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const paymentResult = (raw.payment_result ?? {}) as Record<string, unknown>;
  const redirectUrl = (paymentResult.redirect_url ?? raw.redirect_url) as string | undefined;
  const status = (paymentResult.payment_status ?? raw.status ?? "success") as string;
  const orderId = (raw.order_id ?? raw.id) as number | undefined;

  return {
    status,
    redirectUrl,
    orderId,
    raw,
  };
}
