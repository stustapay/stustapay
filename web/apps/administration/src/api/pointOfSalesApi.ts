import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { PointOfSale } from "../models/pointOfSales";

const pointOfSales: Record<number, PointOfSale> = {
  0: {
    id: 0,
    name: "Potzelt",
    kind: "Bier",
  },
  1: {
    id: 1,
    name: "Weißbierinsel",
    kind: "Bier",
  },
};

export const pointOfSalesApi = createApi({
  reducerPath: "pointOfSales",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8080/api/v1" }),
  tagTypes: ["pointOfSales"],
  endpoints: (builder) => ({
    getPointOfSalesById: builder.query<PointOfSale, number>({
      // query: (id) => `products/${id}`,
      queryFn: (arg, queryApi, extraOptions, baseQuery) => {
        if (pointOfSales[arg]) {
          return { data: pointOfSales[arg] };
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
    getPointOfSales: builder.query<PointOfSale[], void>({
      // query: () => "products",
      queryFn: (arg, queryApi, extraOptions, baseQuery) => {
        return { data: Object.values(pointOfSales) };
      },
    }),
  }),
});

export const { useGetPointOfSalesQuery, useGetPointOfSalesByIdQuery } = pointOfSalesApi;
