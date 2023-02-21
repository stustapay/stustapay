import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { NewTerminalProfile, TerminalProfile } from "@models/terminal";
import { baseUrl, prepareAuthHeaders } from "./common";

export const terminalProfileApi = createApi({
  reducerPath: "terminalProfileApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["terminal-profiles"],
  endpoints: (builder) => ({
    getTerminalProfileById: builder.query<TerminalProfile, number>({
      query: (id) => `/terminal-profiles/${id}/`,
      providesTags: (result, error, arg) => ["terminal-profiles", { type: "terminal-profiles" as const, id: arg }],
    }),
    getTerminalProfiles: builder.query<TerminalProfile[], void>({
      query: () => "/terminal-profiles/",
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: "terminal-profiles" as const, id })), "terminal-profiles"]
          : ["terminal-profiles"],
    }),
    createTerminalProfile: builder.mutation<TerminalProfile, NewTerminalProfile>({
      query: (terminal) => ({ url: "/terminal-profiles/", method: "POST", body: terminal }),
      invalidatesTags: ["terminal-profiles"],
    }),
    updateTerminalProfile: builder.mutation<TerminalProfile, TerminalProfile>({
      query: ({ id, ...profile }) => ({ url: `/terminal-profiles/${id}/`, method: "POST", body: profile }),
      invalidatesTags: ["terminal-profiles"],
    }),
    deleteTerminalProfile: builder.mutation<void, number>({
      query: (id) => ({ url: `/terminal-profiles/${id}/`, method: "DELETE" }),
      invalidatesTags: ["terminal-profiles"],
    }),
  }),
});

export const {
  useCreateTerminalProfileMutation,
  useDeleteTerminalProfileMutation,
  useGetTerminalProfileByIdQuery,
  useGetTerminalProfilesQuery,
  useUpdateTerminalProfileMutation,
} = terminalProfileApi;
