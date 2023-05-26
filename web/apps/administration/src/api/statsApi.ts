import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { Product } from "@stustapay/models";

export type ProductSoldStats = Product & { quantity_sold: number };

export interface ProductStats {
  product_quantities: ProductSoldStats[];
  product_quantities_by_till: { [k: number]: ProductSoldStats[] };
  voucher_stats: { vouchers_issued: number; vouchers_spent: number };
}

export const statsApi = createApi({
  reducerPath: "statsApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: [],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getProductStats: builder.query<ProductStats, { fromTimestamp: string | null; toTimestamp: string | null }>({
      query: ({ fromTimestamp, toTimestamp }) => {
        const queryArgs = new URLSearchParams();
        if (fromTimestamp) {
          queryArgs.append("from_timestamp", fromTimestamp);
        }
        if (toTimestamp) {
          queryArgs.append("to_timestamp", toTimestamp);
        }
        return `/stats/products?${queryArgs.toString()}`;
      },
    }),
  }),
});

export const { useGetProductStatsQuery } = statsApi;
