import { z } from "zod";

type PublicApiConfig = {
  test_mode: boolean;
  test_mode_message: string;
  sumup_topup_enabled_globally: boolean;
  terminal_api_endpoint: string;
};

export const siteHost = window.location.host;
export const siteProtocol = window.location.protocol;
const adminBaseUrl = `${siteProtocol}//${siteHost}`;
const adminApiBaseUrl = `${siteProtocol}//${siteHost}/api`;

export const ConfigSchema = z.object({
  testMode: z.boolean(),
  testModeMessage: z.string(),
  adminApiBaseUrl: z.string(),
  adminBaseUrl: z.string(),
  terminalApiBaseUrl: z.string(),
  sumupTopupEnabledGlobally: z.boolean(),
});

export type Config = z.infer<typeof ConfigSchema>;

export let config: Config;

const generateConfig = (publicApiConfig: PublicApiConfig): Config => {
  return {
    terminalApiBaseUrl: publicApiConfig.terminal_api_endpoint,
    adminApiBaseUrl: adminApiBaseUrl,
    adminBaseUrl: adminBaseUrl,
    testMode: publicApiConfig.test_mode,
    testModeMessage: publicApiConfig.test_mode_message,
    sumupTopupEnabledGlobally: publicApiConfig.sumup_topup_enabled_globally,
  };
};

const fetchPublicConfig = async (): Promise<PublicApiConfig> => {
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
