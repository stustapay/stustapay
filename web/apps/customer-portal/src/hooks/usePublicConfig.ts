import { config, PublicCustomerApiConfig } from "@/api";

export const usePublicConfig = (): PublicCustomerApiConfig => {
  return config.publicApiConfig;
};
