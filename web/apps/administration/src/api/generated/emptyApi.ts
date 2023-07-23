import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "@api/common";

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
