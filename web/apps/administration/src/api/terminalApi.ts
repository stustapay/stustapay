import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Terminal, NewTerminal, UpdateTerminal } from "@models/terminal";
import { baseUrl, prepareAuthHeaders } from "./common";

export const terminalApi = createApi({
  reducerPath: "terminalApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["terminals"],
  endpoints: (builder) => ({
    getTerminalById: builder.query<Terminal, number>({
      query: (id) => `/terminals/${id}/`,
      providesTags: (result, error, arg) => ["terminals", { type: "terminals" as const, id: arg }],
    }),
    getTerminals: builder.query<Terminal[], void>({
      query: () => "/terminals/",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ id }) => ({ type: "terminals" as const, id })), "terminals"] : ["terminals"],
    }),
    createTerminal: builder.mutation<Terminal, NewTerminal>({
      query: (terminal) => ({ url: "/terminals/", method: "POST", body: terminal }),
      invalidatesTags: ["terminals"],
    }),
    updateTerminal: builder.mutation<Terminal, UpdateTerminal>({
      query: ({ id, ...terminal }) => ({ url: `/terminals/${id}/`, method: "POST", body: terminal }),
      invalidatesTags: ["terminals"],
    }),
    logoutTerminal: builder.mutation<void, number>({
      query: (id) => ({ url: `/terminals/${id}/logout/`, method: "POST" }),
      invalidatesTags: (result, error, arg) => [{ type: "terminals", id: arg }],
    }),
    deleteTerminal: builder.mutation<void, number>({
      query: (id) => ({ url: `/terminals/${id}/`, method: "DELETE" }),
      invalidatesTags: ["terminals"],
    }),
  }),
});

export const {
  useCreateTerminalMutation,
  useDeleteTerminalMutation,
  useGetTerminalByIdQuery,
  useGetTerminalsQuery,
  useUpdateTerminalMutation,
  useLogoutTerminalMutation,
} = terminalApi;
