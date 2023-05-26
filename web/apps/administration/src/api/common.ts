import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, BaseQueryApi, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { RootState, selectAuthToken } from "@store";
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

export const StaticAdminConfigSchema = z.object({
  adminApiEndpoint: z.string(),
});

export type StaticAdminConfig = z.infer<typeof StaticAdminConfigSchema>;

export const PublicApiConfigSchema = z.object({
  test_mode: z.boolean(),
  test_mode_message: z.string(),
  terminal_api_endpoint: z.string(),
  currency_symbol: z.string(),
  currency_identifier: z.string(),
});

export type PublicApiConfig = z.infer<typeof PublicApiConfigSchema>;

export const ConfigSchema = StaticAdminConfigSchema.merge(
  z.object({
    testMode: z.boolean(),
    testModeMessage: z.string(),
    adminApiEndpoint: z.string(),
    adminApiBaseUrl: z.string(),
    adminApiBaseWebsocketUrl: z.string(),
    terminalApiBaseUrl: z.string(),
    currencySymbol: z.string(),
    currencyIdentifier: z.string(),
  })
);

export type Config = z.infer<typeof ConfigSchema>;

export let config: Config;

const generateConfig = (staticConfig: StaticAdminConfig, publicApiConfig: PublicApiConfig): Config => {
  return {
    ...staticConfig,
    terminalApiBaseUrl: `http://${publicApiConfig.terminal_api_endpoint}`,
    adminApiBaseUrl: `http://${staticConfig.adminApiEndpoint}`,
    adminApiBaseWebsocketUrl: `ws://${staticConfig.adminApiEndpoint}`,
    currencyIdentifier: publicApiConfig.currency_identifier,
    currencySymbol: publicApiConfig.currency_symbol,
    testMode: publicApiConfig.test_mode,
    testModeMessage: publicApiConfig.test_mode_message,
  };
};

const fetchPublicConfig = async (clientConfig: StaticAdminConfig): Promise<PublicApiConfig> => {
  const resp = await fetch(`http://${clientConfig.adminApiEndpoint}/public-config`);
  const respJson = await resp.json();
  return PublicApiConfigSchema.parse(respJson);
};

export const fetchConfig = async (): Promise<Config> => {
  const resp = await fetch(`http://${siteHost}/assets/config.json`);
  if (resp.status !== 200) {
    throw new Error("error while fetching config");
  }
  const respJson = await resp.json();
  const staticConfig = StaticAdminConfigSchema.parse(respJson);
  const publicConfig = await fetchPublicConfig(staticConfig);
  const c = generateConfig(staticConfig, publicConfig);
  config = c;
  return c;
};

export const adminApiBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const baseUrl = config.adminApiBaseUrl;
  const rawBaseQuery = fetchBaseQuery({ baseUrl, prepareHeaders: prepareAuthHeaders });
  return rawBaseQuery(args, api, extraOptions);
};
