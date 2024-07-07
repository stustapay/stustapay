import { RootState, selectAuthToken } from "@/store";
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { z } from "zod";
import { type Config as BackendConfig } from "./api";

export const siteHost = window.location.host;
export const siteProtocol = window.location.protocol;
const adminBaseUrl = `${siteProtocol}//${siteHost}`;
export const adminApiBaseUrl = `${siteProtocol}//${siteHost}/api`;

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

export const ConfigSchema = z.object({
  testMode: z.boolean(),
  testModeMessage: z.string(),
  adminApiBaseUrl: z.string(),
  adminBaseUrl: z.string(),
  terminalApiBaseUrl: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

export let config: Config;

const generateConfig = (publicApiConfig: BackendConfig): Config => {
  return {
    terminalApiBaseUrl: publicApiConfig.terminal_api_endpoint,
    adminApiBaseUrl: adminApiBaseUrl,
    adminBaseUrl: adminBaseUrl,
    testMode: publicApiConfig.test_mode,
    testModeMessage: publicApiConfig.test_mode_message,
  };
};

const fetchPublicConfig = async (): Promise<BackendConfig> => {
  const resp = await fetch(`${adminApiBaseUrl}/public-config`);
  const respJson = await resp.json();
  return respJson;
};

export const fetchConfig = async (): Promise<Config> => {
  const publicConfig = await fetchPublicConfig();
  const c = generateConfig(publicConfig);
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
