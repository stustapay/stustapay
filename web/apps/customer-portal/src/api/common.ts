import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, BaseQueryApi, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { RootState, selectAuthToken } from "@/store";
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

export const PublicCustomerApiConfigSchema = z.object({
  test_mode: z.boolean(),
  test_mode_message: z.string(),
  currency_symbol: z.string(),
  currency_identifier: z.string(),
  data_privacy_url: z.string(),
  contact_email: z.string(),
  about_page_url: z.string(),
});

export type PublicCustomerApiConfig = z.infer<typeof PublicCustomerApiConfigSchema>;

export const ClientConfigSchema = z.object({
  customerApiEndpoint: z.string(),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;

export const ConfigSchema = ClientConfigSchema.merge(
  z.object({
    customerApiBaseUrl: z.string(),
    publicApiConfig: PublicCustomerApiConfigSchema,
  })
);

export type Config = z.infer<typeof ConfigSchema>;

export let config: Config;

const generateConfig = (clientConfig: ClientConfig, publicApiConfig: PublicCustomerApiConfig): Config => {
  return {
    ...clientConfig,
    customerApiBaseUrl: `http://${clientConfig.customerApiEndpoint}`,
    publicApiConfig: publicApiConfig,
  };
};

const fetchPublicCustomerApiConfig = async (clientConfig: ClientConfig): Promise<PublicCustomerApiConfig> => {
  const resp = await fetch(`http://${clientConfig.customerApiEndpoint}/public_customer_config`);
  const respJson = await resp.json();
  return PublicCustomerApiConfigSchema.parse(respJson);
};

export const fetchConfig = async (): Promise<Config> => {
  const resp = await fetch(`http://${siteHost}/assets/config.json`);
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
