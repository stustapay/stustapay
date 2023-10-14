import { RootState, selectAuthToken } from "@/store";
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
import { Config as BackendConfig } from "./api";

export const siteHost = window.location.host;
export const siteProtocol = window.location.protocol;

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

export const ConfigSchema = StaticAdminConfigSchema.merge(
  z.object({
    testMode: z.boolean(),
    testModeMessage: z.string(),
    adminApiEndpoint: z.string(),
    adminApiBaseUrl: z.string(),
    adminApiBaseWebsocketUrl: z.string(),
    terminalApiBaseUrl: z.string(),
    currencySymbol: z.string(), // TODO: remove as it is now based on the event
  })
);

export type Config = z.infer<typeof ConfigSchema>;

export let config: Config;

const generateConfig = (staticConfig: StaticAdminConfig, publicApiConfig: BackendConfig): Config => {
  return {
    ...staticConfig,
    terminalApiBaseUrl: publicApiConfig.terminal_api_endpoint,
    adminApiBaseUrl: staticConfig.adminApiEndpoint,
    adminApiBaseWebsocketUrl: `${siteProtocol === "https" ? "wss" : "ws"}://${staticConfig.adminApiEndpoint}`,
    testMode: publicApiConfig.test_mode,
    testModeMessage: publicApiConfig.test_mode_message,
    currencySymbol: "€", // TODO: remove
  };
};

const fetchPublicConfig = async (clientConfig: StaticAdminConfig): Promise<BackendConfig> => {
  const resp = await fetch(`${clientConfig.adminApiEndpoint}/public-config`);
  const respJson = await resp.json();
  return respJson;
};

export const fetchConfig = async (): Promise<Config> => {
  const resp = await fetch(`${siteProtocol}//${siteHost}/assets/config.json`);
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
