import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { NewTillProfile, TillProfile } from "@stustapay/models";

const tillProfileAdapter = createEntityAdapter<TillProfile>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const tillProfileApi = createApi({
  reducerPath: "tillProfileApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["till-profiles"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getTillProfileById: builder.query<EntityState<TillProfile>, number>({
      query: (id) => `/till-profiles/${id}/`,
      transformResponse: (response: TillProfile) => {
        return tillProfileAdapter.addOne(tillProfileAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["till-profiles", { type: "till-profiles" as const, id: arg }],
    }),
    getTillProfiles: builder.query<EntityState<TillProfile>, void>({
      query: () => "/till-profiles/",
      transformResponse: (response: TillProfile[]) => {
        return tillProfileAdapter.addMany(tillProfileAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result
          ? [...result.ids.map((id) => ({ type: "till-profiles" as const, id })), "till-profiles"]
          : ["till-profiles"],
    }),
    createTillProfile: builder.mutation<TillProfile, NewTillProfile>({
      query: (till) => ({ url: "/till-profiles/", method: "POST", body: till }),
      invalidatesTags: ["till-profiles"],
    }),
    updateTillProfile: builder.mutation<TillProfile, TillProfile>({
      query: ({ id, ...profile }) => ({ url: `/till-profiles/${id}/`, method: "POST", body: profile }),
      invalidatesTags: ["till-profiles"],
    }),
    deleteTillProfile: builder.mutation<void, number>({
      query: (id) => ({ url: `/till-profiles/${id}/`, method: "DELETE" }),
      invalidatesTags: ["till-profiles"],
    }),
  }),
});

export const {
  selectTillProfileAll,
  selectTillProfileById,
  selectTillProfileEntities,
  selectTillProfileIds,
  selectTillProfileTotal,
} = convertEntityAdaptorSelectors("TillProfile", tillProfileAdapter.getSelectors());

export const {
  useCreateTillProfileMutation,
  useDeleteTillProfileMutation,
  useGetTillProfileByIdQuery,
  useGetTillProfilesQuery,
  useUpdateTillProfileMutation,
} = tillProfileApi;
