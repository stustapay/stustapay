import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { NewTillProfile, TillProfile } from "@models/till";
import { baseUrl, prepareAuthHeaders } from "./common";

export const tillProfileApi = createApi({
  reducerPath: "tillProfileApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["till-profiles"],
  endpoints: (builder) => ({
    getTillProfileById: builder.query<TillProfile, number>({
      query: (id) => `/till-profiles/${id}/`,
      providesTags: (result, error, arg) => ["till-profiles", { type: "till-profiles" as const, id: arg }],
    }),
    getTillProfiles: builder.query<TillProfile[], void>({
      query: () => "/till-profiles/",
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: "till-profiles" as const, id })), "till-profiles"]
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
  useCreateTillProfileMutation,
  useDeleteTillProfileMutation,
  useGetTillProfileByIdQuery,
  useGetTillProfilesQuery,
  useUpdateTillProfileMutation,
} = tillProfileApi;
