import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { NewTicket, Ticket } from "@stustapay/models";

const ticketAdapter = createEntityAdapter<Ticket>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const ticketApi = createApi({
  reducerPath: "ticketApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["ticket"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getTicketById: builder.query<EntityState<Ticket>, number>({
      query: (id) => `/tickets/${id}`,
      transformResponse: (response: Ticket) => {
        return ticketAdapter.addOne(ticketAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["ticket", { type: "ticket" as const, id: arg }],
    }),
    getTickets: builder.query<EntityState<Ticket>, void>({
      query: () => "/tickets",
      transformResponse: (response: Ticket[]) => {
        return ticketAdapter.addMany(ticketAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result ? [...result.ids.map((id) => ({ type: "ticket" as const, id })), "ticket"] : ["ticket"],
    }),
    createTicket: builder.mutation<Ticket, NewTicket>({
      query: (ticket) => ({ url: "/tickets", method: "POST", body: ticket }),
      invalidatesTags: ["ticket"],
    }),
    updateTicket: builder.mutation<Ticket, Ticket>({
      query: ({ id, ...ticket }) => ({ url: `/tickets/${id}`, method: "POST", body: ticket }),
      invalidatesTags: ["ticket"],
    }),
    deleteTicket: builder.mutation<void, number>({
      query: (id) => ({ url: `/tickets/${id}`, method: "DELETE" }),
      invalidatesTags: ["ticket"],
    }),
  }),
});

export const { selectTicketAll, selectTicketById, selectTicketEntities, selectTicketIds, selectTicketTotal } =
  convertEntityAdaptorSelectors("Ticket", ticketAdapter.getSelectors());

export const {
  useGetTicketByIdQuery,
  useGetTicketsQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
} = ticketApi;
