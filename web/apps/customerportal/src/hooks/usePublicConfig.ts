import { CustomerPortalApiConfig } from "@/api";
import { config } from "@/api/common";

export const usePublicConfig = (): CustomerPortalApiConfig => {
  return config.apiConfig;
};
