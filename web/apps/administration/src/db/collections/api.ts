import { QueryClient } from "@tanstack/query-core";

import { store } from "@/store";

import { client } from "../api/generated/client.gen";

client.interceptors.request.use((request, _) => {
  const token = store.getState().auth.token;
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});
