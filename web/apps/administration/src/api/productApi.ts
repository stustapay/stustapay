import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Product } from "../models/product";

export const productApi = createApi({
  reducerPath: "products",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8081" }),
  tagTypes: ["product"],
  endpoints: (builder) => ({
    getProductById: builder.query<Product, number>({
      query: (id) => `products/${id}`,
      providesTags: (result, error, arg) => ["product", { type: "product" as const, id: arg }],
    }),
    getProducts: builder.query<Product[], void>({
      query: () => "products",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ id }) => ({ type: "product" as const, id })), "product"] : ["product"],
    }),
    addProduct: builder.mutation<Product, Omit<Product, "id">>({
      query: (id) => `products/${id}`,
      invalidatesTags: ["product"],
    }),
    updateProduct: builder.mutation<Product, Partial<Product> & Pick<Product, "id">>({
      query: (id) => `products/${id}`,
      invalidatesTags: ["product"],
    }),
  }),
});

export const { useGetProductByIdQuery, useGetProductsQuery, useAddProductMutation, useUpdateProductMutation } =
  productApi;
