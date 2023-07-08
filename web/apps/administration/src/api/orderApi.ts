import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { Order, SaleEdit } from "@stustapay/models";

const orderAdapter = createEntityAdapter<Order>({ sortComparer: (a, b) => b.id - a.id });

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["order"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getOrderById: builder.query<EntityState<Order>, number>({
      query: (id) => `/orders/${id}`,
      transformResponse: (response: Order) => {
        return orderAdapter.upsertOne(orderAdapter.getInitialState(), response);
      },
    }),
    getOrderByTill: builder.query<EntityState<Order>, number>({
      query: (id) => `/orders/by-till/${id}`,
      transformResponse: (response: Order[]) => {
        return orderAdapter.addMany(orderAdapter.getInitialState(), response);
      },
    }),
    getOrderByCustomer: builder.query<EntityState<Order>, number>({
      query: (id) => `/orders?customer_account_id=${id}`,
      transformResponse: (response: Order[]) => {
        return orderAdapter.addMany(orderAdapter.getInitialState(), response);
      },
    }),
    cancelSale: builder.mutation<void, { sale_id: number }>({
      query: ({ sale_id }) => ({ url: `/orders/${sale_id}`, method: "DELETE" }),
      invalidatesTags: ["order"],
    }),
    editSale: builder.mutation<{ id: number }, SaleEdit>({
      query: ({ order_id, ...sale }) => ({ url: `/orders/${order_id}/edit`, method: "POST", body: sale }),
      invalidatesTags: ["order"],
    }),
    getOrders: builder.query<EntityState<Order>, void>({
      query: () => "/orders",
      transformResponse: (response: Order[]) => {
        return orderAdapter.addMany(orderAdapter.getInitialState(), response);
      },
      providesTags: (result) =>
        result ? [...result.ids.map((id) => ({ type: "order" as const, id })), "order"] : ["order"],
      // onCacheEntryAdded: async (arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved, getState }) => {
      //   const token = selectAuthToken(getState() as RootState);
      //   if (!token) {
      //     return;
      //   }
      //   document.cookie = `authorization=${token}`;
      //   // create a websocket connection when the cache subscription starts
      //   const ws = new WebSocket(`${config.adminApiBaseWebsocketUrl}/orders/ws`);
      //   try {
      //     // wait for the initial query to resolve before proceeding
      //     await cacheDataLoaded;

      //     // when data is received from the socket connection to the server,
      //     // if it is a message and for the appropriate channel,
      //     // update our query result with the received message
      //     const listener = (event: MessageEvent) => {
      //       const data = JSON.parse(event.data);
      //       const parsedOrder = OrderSchema.safeParse(data);
      //       if (!parsedOrder.success) {
      //         console.log("order parsing failed", parsedOrder.error, data);
      //         return;
      //       }

      //       updateCachedData((orders) => {
      //         orderAdapter.upsertOne(orders, parsedOrder.data);
      //       });
      //     };

      //     ws.addEventListener("message", listener);
      //   } catch {
      //     // no-op in case `cacheEntryRemoved` resolves before `cacheDataLoaded`,
      //     // in which case `cacheDataLoaded` will throw
      //   }
      //   // cacheEntryRemoved will resolve when the cache subscription is no longer active
      //   await cacheEntryRemoved;
      //   // perform cleanup steps once the `cacheEntryRemoved` promise resolves
      //   ws.close();
      // },
    }),
  }),
});

export const { selectOrderAll, selectOrderById, selectOrderEntities, selectOrderIds, selectOrderTotal } =
  convertEntityAdaptorSelectors("Order", orderAdapter.getSelectors());

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useGetOrderByTillQuery,
  useGetOrderByCustomerQuery,
  useCancelSaleMutation,
  useEditSaleMutation,
} = orderApi;
