import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { NewProduct, Product } from "@stustapay/models";

const productAdapter = createEntityAdapter<Product>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["product"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getProductById: builder.query<EntityState<Product>, number>({
      query: (id) => `/products/${id}`,
      transformResponse: (response: Product) => {
        return productAdapter.addOne(productAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["product", { type: "product" as const, id: arg }],
    }),
    getProducts: builder.query<EntityState<Product>, void>({
      query: () => "/products",
      transformResponse: (response: Product[]) => {
        return productAdapter.addMany(productAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result ? [...result.ids.map((id) => ({ type: "product" as const, id })), "product"] : ["product"],
    }),
    createProduct: builder.mutation<Product, NewProduct>({
      query: (product) => ({ url: "/products", method: "POST", body: product }),
      invalidatesTags: ["product"],
    }),
    updateProduct: builder.mutation<Product, Product>({
      query: ({ id, ...product }) => ({ url: `/products/${id}`, method: "POST", body: product }),
      invalidatesTags: ["product"],
    }),
    lockProduct: builder.mutation<Product, Product>({
      query: ({ id, ...product }) => ({
        url: `/products/${id}`,
        method: "POST",
        body: { ...product, is_locked: true },
      }),
      invalidatesTags: ["product"],
    }),
    deleteProduct: builder.mutation<void, number>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["product"],
    }),
  }),
});

export const { selectProductAll, selectProductById, selectProductEntities, selectProductIds, selectProductTotal } =
  convertEntityAdaptorSelectors("Product", productAdapter.getSelectors());

export const {
  useGetProductByIdQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useLockProductMutation,
} = productApi;
