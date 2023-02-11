import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { NewProduct, Product } from "../models/product";
import { baseUrl, prepareAuthHeaders } from "./common";

export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["product"],
  endpoints: (builder) => ({
    getProductById: builder.query<Product, number>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, arg) => ["product", { type: "product" as const, id: arg }],
    }),
    getProducts: builder.query<Product[], void>({
      query: () => "/products",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ id }) => ({ type: "product" as const, id })), "product"] : ["product"],
    }),
    createProduct: builder.mutation<Product, NewProduct>({
      query: (product) => ({ url: "/products", method: "POST", body: product }),
      invalidatesTags: ["product"],
    }),
    updateProduct: builder.mutation<Product, Product>({
      query: ({ id, ...product }) => ({ url: `/products/${id}`, method: "POST", body: product }),
      invalidatesTags: ["product"],
    }),
    deleteProduct: builder.mutation<void, number>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["product"],
    }),
  }),
});

export const {
  useGetProductByIdQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
