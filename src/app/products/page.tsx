import ProductsClient from "@/app/products/ProductsClient";
import { getCatalogProducts } from "@/lib/storefront/server";

type Props = {
  searchParams: Promise<{
    category?: string;
    concern?: string;
    brand?: string;
    sort?: string;
  }>;
};

export const revalidate = 300;

function normalizeSlug(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized ? normalized : null;
}

function normalizeSort(value: string | undefined): "default" | "new" | "bestsellers" {
  if (value === "new") {
    return "new";
  }
  if (value === "bestsellers") {
    return "bestsellers";
  }
  return "default";
}

function parseSlugList(value: string | undefined, fallback: string[]): string[] {
  const raw = value?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = raw
    .split(",")
    .map((part) => normalizeSlug(part))
    .filter((part): part is string => Boolean(part));
  return parsed.length > 0 ? parsed : fallback;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = normalizeSort(params.sort);
  const bestsellerSlugs = parseSlugList(process.env.WOO_BESTSELLER_SLUGS, ["bestseller", "bestsellers"]);
  const newArrivalSlugs = parseSlugList(process.env.WOO_NEW_ARRIVAL_SLUGS, [
    "new",
    "new-arrival",
    "new-arrivals",
  ]);
  const categoryFilter =
    normalizeSlug(params.category) ?? normalizeSlug(params.concern) ?? normalizeSlug(params.brand);
  let catalog = await getCatalogProducts();

  if (categoryFilter) {
    catalog = catalog.filter((product) => product.categorySlugs.includes(categoryFilter));
  }

  if (sort === "new") {
    const tagged = catalog.filter((product) =>
      product.categorySlugs.some((slug) => newArrivalSlugs.includes(slug)),
    );
    catalog = tagged.length > 0 ? tagged : [...catalog].sort((a, b) => b.id - a.id);
  } else if (sort === "bestsellers") {
    const tagged = catalog.filter((product) =>
      product.categorySlugs.some((slug) => bestsellerSlugs.includes(slug)),
    );
    catalog =
      tagged.length > 0
        ? tagged
        : [...catalog].sort((a, b) => {
            const discountA = a.hasDiscount ? 1 : 0;
            const discountB = b.hasDiscount ? 1 : 0;
            if (discountA !== discountB) {
              return discountB - discountA;
            }
            return b.id - a.id;
          });
  }

  const requestedCategory = normalizeSlug(params.category);
  const normalizedRequestedCategory =
    typeof requestedCategory === "string" ? requestedCategory : undefined;

  const initialCategory =
    normalizedRequestedCategory &&
    catalog.some((product) => product.categorySlug === normalizedRequestedCategory)
      ? normalizedRequestedCategory
      : "all";

  return <ProductsClient initialProducts={catalog} initialCategory={initialCategory} />;
}
