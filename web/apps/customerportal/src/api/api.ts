import { api as generatedApi } from "./generated/api";

generatedApi.enhanceEndpoints({
  endpoints: {
    checkSharedTopupCheckout: {
      invalidatesTags: [],
    },
  },
});

export * from "./generated/api";
export { generatedApi as api };
