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

export const ClientConfigSchema = z.object({
  adminApiEndpoint: z.string(),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;

export const ConfigSchema = ClientConfigSchema.merge(
  z.object({
    adminApiEndpoint: z.string(),
    adminApiBaseUrl: z.string(),
    adminApiBaseWebsocketUrl: z.string(),
    terminalApiBaseUrl: z.string(),
  })
);

export type Config = z.infer<typeof ConfigSchema>;

export let config: Config;

const generateConfig = (clientConfig: ClientConfig, terminalApiEndpoint: string): Config => {
  return {
    ...clientConfig,
    terminalApiBaseUrl: `http://${terminalApiEndpoint}`,
    adminApiBaseUrl: `http://${clientConfig.adminApiEndpoint}`,
    adminApiBaseWebsocketUrl: `ws://${clientConfig.adminApiEndpoint}`,
  };
};

const fetchTerminalApiEndpoint = async (clientConfig: ClientConfig) => {
  const resp = await fetch(`http://${clientConfig.adminApiEndpoint}/api-endpoints`);
  const respJson = await resp.json();
  return respJson["terminal_api_endpoint"];
};

export const fetchConfig = async (): Promise<Config> => {
  const resp = await fetch(`http://${siteHost}/assets/config.json`);
  if (resp.status !== 200) {
    throw new Error("error while fetching config");
  }
  const respJson = await resp.json();
  const clientConfig = ClientConfigSchema.parse(respJson);
  const terminalApiEndpoint = await fetchTerminalApiEndpoint(clientConfig);
  const c = generateConfig(clientConfig, terminalApiEndpoint);
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
