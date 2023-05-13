import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { Product } from "@stustapay/models";

export interface ProductStats {
  ten_most_sold_products: Array<Product & { quantity_sold: number }>;
}

export const statsApi = createApi({
  reducerPath: "statsApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: [],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getProductStats: builder.query<ProductStats, void>({
      query: () => "/stats/products/",
    }),
  }),
});

export const { useGetProductStatsQuery } = statsApi;
