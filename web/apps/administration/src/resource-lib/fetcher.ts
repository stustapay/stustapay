import { selectAuthToken, store } from "@/store";

export const fetcher = async (resource: string | URL | globalThis.Request, init?: RequestInit) => {
  const token = selectAuthToken(store.getState());
  const headers = { Authorization: `Bearer ${token}` };
  const resp = await fetch(resource, { ...init, headers });
  return resp.json();
};
