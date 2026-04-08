import { NextResponse } from "next/server";

import { getStorefrontNavigation } from "@/lib/storefront/server";

export async function GET(): Promise<NextResponse> {
  const navigation = await getStorefrontNavigation();
  return NextResponse.json(navigation);
}
