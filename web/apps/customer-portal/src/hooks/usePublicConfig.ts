import { config, PublicCustomerApiConfig } from "@/api/common";

export const usePublicConfig = (): PublicCustomerApiConfig => {
  return config.publicApiConfig;
};