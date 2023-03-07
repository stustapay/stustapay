import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  NewTerminalLayout,
  TerminalLayout,
  TerminalButton,
  NewTerminalButton,
  UpdateTerminalButton,
} from "@models/terminal";
import { baseUrl, prepareAuthHeaders } from "./common";

export const terminalLayoutApi = createApi({
  reducerPath: "terminalLayoutApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["terminal-buttons", "terminal-layouts"],
  endpoints: (builder) => ({
    getTerminalButtonById: builder.query<TerminalButton, number>({
      query: (id) => `/terminal-buttons/${id}/`,
      providesTags: (result, error, arg) => ["terminal-buttons", { type: "terminal-buttons" as const, id: arg }],
    }),
    getTerminalButtons: builder.query<TerminalButton[], void>({
      query: () => "/terminal-buttons/",
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: "terminal-buttons" as const, id })), "terminal-buttons"]
          : ["terminal-buttons"],
    }),
    createTerminalButton: builder.mutation<TerminalButton, NewTerminalButton>({
      query: (terminal) => ({ url: "/terminal-buttons/", method: "POST", body: terminal }),
      invalidatesTags: ["terminal-buttons"],
    }),
    updateTerminalButton: builder.mutation<TerminalButton, UpdateTerminalButton>({
      query: ({ id, ...layout }) => ({ url: `/terminal-buttons/${id}/`, method: "POST", body: layout }),
      invalidatesTags: ["terminal-buttons"],
    }),
    deleteTerminalButton: builder.mutation<void, number>({
      query: (id) => ({ url: `/terminal-buttons/${id}/`, method: "DELETE" }),
      invalidatesTags: ["terminal-buttons"],
    }),
    getTerminalLayoutById: builder.query<TerminalLayout, number>({
      query: (id) => `/terminal-layouts/${id}/`,
      providesTags: (result, error, arg) => ["terminal-layouts", { type: "terminal-layouts" as const, id: arg }],
    }),
    getTerminalLayouts: builder.query<TerminalLayout[], void>({
      query: () => "/terminal-layouts/",
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: "terminal-layouts" as const, id })), "terminal-layouts"]
          : ["terminal-layouts"],
    }),
    createTerminalLayout: builder.mutation<TerminalLayout, NewTerminalLayout>({
      query: (terminal) => ({ url: "/terminal-layouts/", method: "POST", body: terminal }),
      invalidatesTags: ["terminal-layouts"],
    }),
    updateTerminalLayout: builder.mutation<TerminalLayout, TerminalLayout>({
      query: ({ id, ...layout }) => ({ url: `/terminal-layouts/${id}/`, method: "POST", body: layout }),
      invalidatesTags: ["terminal-layouts"],
    }),
    deleteTerminalLayout: builder.mutation<void, number>({
      query: (id) => ({ url: `/terminal-layouts/${id}/`, method: "DELETE" }),
      invalidatesTags: ["terminal-layouts"],
    }),
  }),
});

export const {
  useCreateTerminalLayoutMutation,
  useDeleteTerminalLayoutMutation,
  useGetTerminalLayoutByIdQuery,
  useGetTerminalLayoutsQuery,
  useUpdateTerminalLayoutMutation,
  useCreateTerminalButtonMutation,
  useDeleteTerminalButtonMutation,
  useGetTerminalButtonByIdQuery,
  useGetTerminalButtonsQuery,
  useUpdateTerminalButtonMutation,
} = terminalLayoutApi;
