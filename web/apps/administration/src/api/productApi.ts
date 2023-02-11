import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { NewProduct, Product } from "../models/product";

export const productApi = createApi({
  reducerPath: "products",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8081" }),
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
  }),
});

export const { useGetProductByIdQuery, useGetProductsQuery, useCreateProductMutation, useUpdateProductMutation } =
  productApi;
