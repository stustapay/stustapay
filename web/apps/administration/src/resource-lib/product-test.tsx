import { Product } from "@/api";
import { ResourceDefinition } from "./resource";

export const productResource: ResourceDefinition<Product> = {
  name: "product",
  listFetchConfig: {
    url: "/api/products?node_id=1001",
  },
  detailFetchConfig: {
    url: (id: number) => `/api/products/${id}?node_id=1001`,
  },
  fields: {
    id: {
      type: "int",
      hidden: true,
    },
    name: {
      label: "product.name",
      type: "string",
    },
    type: {
      type: "string",
      hidden: true,
    },
    restrictions: {
      label: "product.restrictions",
      type: "enum",
      options: ["under_16", "under_18"],
      optional: true,
    },
    is_locked: {
      label: "product.isLocked",
      type: "boolean",
    },
    is_returnable: {
      label: "product.isReturnable",
      type: "boolean",
    },
    fixed_price: {
      label: "product.isFixedPrice",
      type: "boolean",
    },
    price: {
      label: "product.price",
      type: "double",
    },
    tax_name: {
      label: "product.taxRate",
      type: "string",
    },
  },
  listViewConfig: {
    hiddenFields: [],
  },
  actions: [],
};
