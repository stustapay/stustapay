type EventDesign = {
  bon_logo_blob_id: string | null;
};

type CustomerPortalApiConfig = {
  test_mode: boolean;
  test_mode_message: string;
  event_name: string;
  data_privacy_url: string;
  contact_email: string;
  about_page_url: string;
  payout_enabled: boolean;
  currency_identifier: string;
  sumup_topup_enabled: boolean;
  allowed_country_codes: string[] | null;
  translation_texts: {
    [key: string]: {
      [key: string]: string;
    };
  };
  event_design: EventDesign;
  node_id: number;
  feedback_url?: string | null;
};

const siteHost = window.location.host;
const siteProtocol = window.location.protocol;
const customerApiBaseUrl = `${siteProtocol}//${siteHost}/api`;

export interface Config {
  customerApiBaseUrl: string;
  apiConfig: CustomerPortalApiConfig;
}

export let config: Config;

const generateConfig = (publicApiConfig: CustomerPortalApiConfig): Config => {
  return {
    customerApiBaseUrl: customerApiBaseUrl,
    apiConfig: publicApiConfig,
  };
};

const fetchPublicCustomerApiConfig = async (): Promise<CustomerPortalApiConfig> => {
  const baseUrl = encodeURIComponent(window.location.origin);
  const resp = await fetch(`${customerApiBaseUrl}/config?base_url=${baseUrl}`);
  const respJson = await resp.json();
  // TODO: validation
  return respJson as CustomerPortalApiConfig;
};

export const fetchConfig = async (): Promise<Config> => {
  const publicConfig = await fetchPublicCustomerApiConfig();
  const c = generateConfig(publicConfig);
  config = c;
  return c;
};
