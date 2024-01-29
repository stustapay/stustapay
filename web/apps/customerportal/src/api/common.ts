import { type CustomerPortalApiConfig } from "@/api";
import { RootState, selectAuthToken } from "@/store";
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { z } from "zod";

const siteHost = window.location.host;

const prepareAuthHeaders = (
  headers: Headers,
  { getState }: Pick<BaseQueryApi, "getState" | "extra" | "endpoint" | "type" | "forced">
) => {
  const token = selectAuthToken(getState() as RootState);
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
};

const ClientConfigSchema = z.object({
  customerApiEndpoint: z.string(),
});

type ClientConfig = z.infer<typeof ClientConfigSchema>;

export interface Config {
  customerApiBaseUrl: string;
  apiConfig: CustomerPortalApiConfig;
}

export let config: Config;

const generateConfig = (clientConfig: ClientConfig, publicApiConfig: CustomerPortalApiConfig): Config => {
  return {
    ...clientConfig,
    customerApiBaseUrl: clientConfig.customerApiEndpoint,
    apiConfig: publicApiConfig,
  };
};

const fetchPublicCustomerApiConfig = async (clientConfig: ClientConfig): Promise<CustomerPortalApiConfig> => {
  const baseUrl = encodeURIComponent(window.location.origin);
  const resp = await fetch(`${clientConfig.customerApiEndpoint}/config?base_url=${baseUrl}`);
  const respJson = await resp.json();
  // TODO: validation
  return respJson as CustomerPortalApiConfig;
};

export const fetchConfig = async (): Promise<Config> => {
  const resp = await fetch(`${window.location.protocol}//${siteHost}/assets/config.json`);
  const respJson = await resp.json();
  const clientConfig = ClientConfigSchema.parse(respJson);
  const publicConfig = await fetchPublicCustomerApiConfig(clientConfig);
  const c = generateConfig(clientConfig, publicConfig);
  config = c;
  return c;
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
