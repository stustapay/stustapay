import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Order } from "@models/order";
import { baseUrl, prepareAuthHeaders } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const orderAdapter = createEntityAdapter<Order>();

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["order"],
  endpoints: (builder) => ({
    getOrders: builder.query<EntityState<Order>, void>({
      query: () => "/orders/",
      transformResponse: (response: Order[]) => {
        return orderAdapter.addMany(orderAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result ? [...result.ids.map((id) => ({ type: "order" as const, id })), "order"] : ["order"],
    }),
  }),
});

export const { selectOrderAll, selectOrderById, selectOrderEntities, selectOrderIds, selectOrderTotal } =
  convertEntityAdaptorSelectors("Order", orderAdapter.getSelectors());

export const { useGetOrdersQuery } = orderApi;
