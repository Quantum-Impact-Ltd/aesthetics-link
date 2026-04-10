import { NextRequest, NextResponse } from "next/server";

const CART_TOKEN_COOKIE = "woo_cart_token";
const NONCE_TOKEN_COOKIE = "woo_nonce_token";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const orderId = searchParams.get("order_id") ?? "";
  const orderKey = searchParams.get("key") ?? "";

  const confirmUrl = new URL("/order-confirmed", request.nextUrl.origin);
  if (orderId) confirmUrl.searchParams.set("order_id", orderId);
  if (orderKey) confirmUrl.searchParams.set("key", orderKey);

  const response = NextResponse.redirect(confirmUrl, 302);

  response.cookies.set(CART_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(NONCE_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
