import { adminApiBaseQuery } from "@/api/common";
import { createApi } from "@reduxjs/toolkit/query/react";

/**
 * This is the base template for generated api slices
 */
export const emptySplitApi = createApi({
  baseQuery: adminApiBaseQuery,
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
