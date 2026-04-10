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

function normalizeSlug(value: string | null | undefined): string | null {
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

function isBestsellerSlug(slug: string): boolean {
  return /(^|-)best-?seller(s)?(-|$)/.test(slug);
}

function isNewArrivalSlug(slug: string): boolean {
  return /(^|-)new(-|$)|(^|-)new-arrival(s)?(-|$)|(^|-)latest(-|$)/.test(slug);
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = normalizeSort(params.sort);
  const concernFilter = normalizeSlug(params.category) ?? normalizeSlug(params.concern);
  const brandFilter = normalizeSlug(params.brand);
  let catalog = await getCatalogProducts();

  if (sort === "new") {
    const tagged = catalog.filter((product) =>
      product.categorySlugs.some((slug) => isNewArrivalSlug(slug)),
    );
    catalog = tagged.length > 0 ? tagged : [...catalog].sort((a, b) => b.id - a.id);
  } else if (sort === "bestsellers") {
    const tagged = catalog.filter((product) =>
      product.categorySlugs.some((slug) => isBestsellerSlug(slug)),
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

  const initialConcern =
    concernFilter &&
    catalog.some((product) => {
      const allSlugs = [product.categorySlug, ...product.categorySlugs]
        .map((slug) => normalizeSlug(slug))
        .filter((slug): slug is string => Boolean(slug));
      return allSlugs.includes(concernFilter);
    })
      ? concernFilter
      : "all";

  const initialBrand =
    brandFilter &&
    catalog.some((product) => {
      const allSlugs = [product.brandSlug, ...(product.brandSlugs ?? [])]
        .map((slug) => normalizeSlug(slug))
        .filter((slug): slug is string => Boolean(slug));
      return allSlugs.includes(brandFilter);
    })
      ? brandFilter
      : "all";

  return (
    <ProductsClient
      initialProducts={catalog}
      initialConcern={initialConcern}
      initialBrand={initialBrand}
    />
  );
}
