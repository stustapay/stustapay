import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Product } from "../models/product";

const products: Record<number, Product> = {
  0: {
    id: 0,
    name: "Helles 0,5l",
    price: 3,
  },
  1: {
    id: 1,
    name: "Radler 0,5l",
    price: 3,
  },
  2: {
    id: 2,
    name: "Helles 1l",
    price: 5,
  },
  3: {
    id: 3,
    name: "Helles 1l",
    price: 5,
  },
};

export const productApi = createApi({
  reducerPath: "products",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8080/api/v1" }),
  tagTypes: ["product"],
  endpoints: (builder) => ({
    getProductById: builder.query<Product, number>({
      // query: (id) => `products/${id}`,
      providesTags: (result, error, arg) => ["product", { type: "product" as const, id: arg }],
      queryFn: (arg, queryApi, extraOptions, baseQuery) => {
        if (products[arg]) {
          return { data: products[arg] };
        }
        return {
          error: {
            status: 404,
            statusText: "not found",
            data: "not found",
          },
        };
      },
    }),
    getProducts: builder.query<Product[], void>({
      // query: () => "products",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ id }) => ({ type: "product" as const, id })), "product"] : ["product"],
      queryFn: (arg, queryApi, extraOptions, baseQuery) => {
        return { data: Object.values(products) };
      },
    }),
    addProduct: builder.mutation<Product, Omit<Product, "id">>({
      invalidatesTags: ["product"],
      queryFn: (body) => {
        const newProduct: Product = {
          ...body,
          id: Number(Math.max(...Object.keys(products).map((id) => Number(id)))) + 1,
        };
        products[newProduct.id] = newProduct;
        return { data: newProduct };
      },
    }),
    updateProduct: builder.mutation<Product, Partial<Product> & Pick<Product, "id">>({
      invalidatesTags: ["product"],
      queryFn: (body) => {
        if (!products[body.id]) {
          return {
            error: {
              status: 404,
              statusText: "not found",
              data: "not found",
            },
          };
        }
        const newProduct: Product = {
          ...products[body.id],
          ...body,
        };
        products[body.id] = newProduct;
        return { data: newProduct };
      },
    }),
  }),
});

export const { useGetProductByIdQuery, useGetProductsQuery, useAddProductMutation, useUpdateProductMutation } =
  productApi;
