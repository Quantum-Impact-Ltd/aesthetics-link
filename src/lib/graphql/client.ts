import "server-only";

import { getGraphQLUrl } from "@/lib/storefront/config";

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { tags?: string[]; revalidate?: number },
): Promise<T> {
  const url = getGraphQLUrl();
  if (!url) {
    throw new Error("GraphQL endpoint not configured. Set WORDPRESS_GRAPHQL_URL in your environment.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: {
      revalidate: options?.revalidate ?? 300,
      tags: options?.tags ?? [],
    },
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed (${response.status})`);
  }

  return (await response.json()) as T;
}
