import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState, selectAuthToken } from "@/store";
import { PublicCustomerApiConfig } from "@/api";
import { z } from "zod";

export const siteHost = window.location.host;

export const prepareAuthHeaders = (
  headers: Headers,
  { getState }: Pick<BaseQueryApi, "getState" | "extra" | "endpoint" | "type" | "forced">
) => {
  const token = selectAuthToken(getState() as RootState);
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
};

export const ClientConfigSchema = z.object({
  customerApiEndpoint: z.string(),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;

export interface Config {
  customerApiBaseUrl: string;
  publicApiConfig: PublicCustomerApiConfig;
}

export let config: Config;

const generateConfig = (clientConfig: ClientConfig, publicApiConfig: PublicCustomerApiConfig): Config => {
  return {
    ...clientConfig,
    customerApiBaseUrl: clientConfig.customerApiEndpoint,
    publicApiConfig: publicApiConfig,
  };
};

const fetchPublicCustomerApiConfig = async (clientConfig: ClientConfig): Promise<PublicCustomerApiConfig> => {
  const resp = await fetch(`${clientConfig.customerApiEndpoint}/public_customer_config`);
  const respJson = await resp.json();
  // TODO: validation
  return respJson as PublicCustomerApiConfig;
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
