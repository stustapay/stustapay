import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { config } from "./common";

type AuthSliceState = { auth: { token: string | null } };

const prepareAuthHeaders = (
  headers: Headers,
  { getState }: Pick<BaseQueryApi, "getState" | "extra" | "endpoint" | "type" | "forced">
) => {
  const token = (getState() as AuthSliceState).auth.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

export const customerApiBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const baseUrl = config.customerApiBaseUrl;
  const rawBaseQuery = fetchBaseQuery({ baseUrl, prepareHeaders: prepareAuthHeaders });
  return rawBaseQuery(args, api, extraOptions);
};
