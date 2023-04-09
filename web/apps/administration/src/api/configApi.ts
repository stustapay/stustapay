import { createApi } from "@reduxjs/toolkit/query/react";
import { ConfigEntry } from "@models";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const configAdaptor = createEntityAdapter<ConfigEntry>({
  selectId: (entry) => entry.key,
  sortComparer: (a, b) => a.key.localeCompare(b.key),
});

export const configApi = createApi({
  reducerPath: "configApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["config"],
  endpoints: (builder) => ({
    getConfigEntries: builder.query<EntityState<ConfigEntry>, void>({
      query: () => "/config/",
      transformResponse: (response: ConfigEntry[]) => {
        return configAdaptor.addMany(configAdaptor.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result ? [...result.ids.map((id) => ({ type: "config" as const, id })), "config"] : ["config"],
    }),
    setConfigEntry: builder.mutation<ConfigEntry, ConfigEntry>({
      query: (configEntry) => ({ url: "/config/", method: "POST", body: configEntry }),
      invalidatesTags: ["config"],
    }),
  }),
});

export const {
  selectConfigEntryById,
  selectConfigEntryAll,
  selectConfigEntryEntities,
  selectConfigEntryIds,
  selectConfigEntryTotal,
} = convertEntityAdaptorSelectors("configEntry", configAdaptor.getSelectors());

export const { useGetConfigEntriesQuery, useSetConfigEntryMutation } = configApi;
