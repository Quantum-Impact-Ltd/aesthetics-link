export type GQLProductImage = {
  sourceUrl: string;
  altText: string;
};

export type GQLProductCategory = {
  name: string;
  slug: string;
};

export type GQLProductBrand = {
  name: string;
  slug: string;
};

export type GQLProductAttribute = {
  name: string;
  label: string;
  options: string[];
  variation: boolean;
};

export type GQLVariationAttribute = {
  name: string;
  value: string;
  label: string;
};

export type GQLProductVariation = {
  databaseId: number;
  stockStatus: string;
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  attributes: { nodes: GQLVariationAttribute[] };
};

export type GQLProductBase = {
  databaseId: number;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  shortDescription: string | null;
  image: GQLProductImage | null;
  galleryImages: { nodes: GQLProductImage[] };
  productCategories: { nodes: GQLProductCategory[] };
  productBrands?: { nodes: GQLProductBrand[] } | null;
};

export type GQLSimpleProduct = GQLProductBase & {
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  stockStatus: string;
};

export type GQLVariableProduct = GQLProductBase & {
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  stockStatus: string;
  attributes: { nodes: GQLProductAttribute[] };
  defaultAttributes: { nodes: Array<{ name: string; value: string }> };
  variations: { nodes: GQLProductVariation[] };
};

export type GQLProduct = GQLSimpleProduct | GQLVariableProduct;

export type GQLProductDetailResponse = {
  data: { product: GQLProduct | null } | null;
  errors?: Array<{ message: string }>;
};

export type GQLProductsResponse = {
  data: { products: { nodes: GQLProduct[] } } | null;
  errors?: Array<{ message: string }>;
};
