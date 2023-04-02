import { createApi } from "@reduxjs/toolkit/query/react";
import { Order, OrderSchema } from "@models/order";
import { config, adminApiBaseQuery } from "./common";
import { RootState, selectAuthToken } from "@store";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const orderAdapter = createEntityAdapter<Order>({ sortComparer: (a, b) => b.id - a.id });

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["order"],
  endpoints: (builder) => ({
    getOrders: builder.query<EntityState<Order>, void>({
      query: () => "/orders/",
      transformResponse: (response: Order[]) => {
        return orderAdapter.addMany(orderAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result ? [...result.ids.map((id) => ({ type: "order" as const, id })), "order"] : ["order"],
      onCacheEntryAdded: async (arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved, getState }) => {
        const token = selectAuthToken(getState() as RootState);
        if (!token) {
          return;
        }
        document.cookie = `authorization=${token}`;
        // create a websocket connection when the cache subscription starts
        const ws = new WebSocket(`${config.adminApiBaseWebsocketUrl}/orders/ws`);
        try {
          // wait for the initial query to resolve before proceeding
          await cacheDataLoaded;

          // when data is received from the socket connection to the server,
          // if it is a message and for the appropriate channel,
          // update our query result with the received message
          const listener = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            const parsedOrder = OrderSchema.safeParse(data);
            if (!parsedOrder.success) {
              console.log("order parsing failed", parsedOrder.error, data);
              return;
            }

            updateCachedData((orders) => {
              orderAdapter.upsertOne(orders, parsedOrder.data);
            });
          };

          ws.addEventListener("message", listener);
        } catch {
          // no-op in case `cacheEntryRemoved` resolves before `cacheDataLoaded`,
          // in which case `cacheDataLoaded` will throw
        }
        // cacheEntryRemoved will resolve when the cache subscription is no longer active
        await cacheEntryRemoved;
        // perform cleanup steps once the `cacheEntryRemoved` promise resolves
        ws.close();
      },
    }),
  }),
});

export const { selectOrderAll, selectOrderById, selectOrderEntities, selectOrderIds, selectOrderTotal } =
  convertEntityAdaptorSelectors("Order", orderAdapter.getSelectors());

export const { useGetOrdersQuery } = orderApi;
