import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ConfigEntry } from "@models";
import { baseUrl, prepareAuthHeaders } from "./common";

export const configApi = createApi({
  reducerPath: "configApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["config"],
  endpoints: (builder) => ({
    getConfigEntries: builder.query<ConfigEntry[], void>({
      query: () => "/config/",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ key }) => ({ type: "config" as const, key })), "config"] : ["config"],
    }),
    setConfigEntry: builder.mutation<ConfigEntry, ConfigEntry>({
      query: (configEntry) => ({ url: "/config/", method: "POST", body: configEntry }),
      invalidatesTags: ["config"],
    }),
  }),
});

export const { useGetConfigEntriesQuery, useSetConfigEntryMutation } = configApi;
