import { customerApiBaseQuery } from "@/api/common";
import { createApi } from "@reduxjs/toolkit/query/react";

/**
 * This is the base template for generated api slices
 */
export const emptySplitApi = createApi({
  baseQuery: customerApiBaseQuery,
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
