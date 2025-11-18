import { api } from "./api";

export interface HeadwindDevice {
  id: number | string;
  device_number?: string | null;
  serial?: string | null;
  imei?: string | null;
  description?: string | null;
  configuration_name?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  last_update?: string | null;
  last_ip?: string | null;
  [key: string]: unknown;
}

export interface HeadwindDeviceMapping {
  id: number;
  node_id: number;
  terminal_id: number;
  headwind_device_id: string;
  headwind_device_number?: string | null;
  headwind_device_name?: string | null;
  headwind_device_serial?: string | null;
  headwind_device_model?: string | null;
  last_synced_at?: string | null;
  last_token_pushed_at?: string | null;
  last_push_status?: string | null;
  last_push_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeadwindDeviceMappingWithTerminal extends HeadwindDeviceMapping {
  terminal_name: string;
  terminal_description?: string | null;
}

export interface HeadwindDeviceWithMapping {
  device: HeadwindDevice;
  mapping?: HeadwindDeviceMappingWithTerminal | null;
}

interface ListDevicesArgs {
  nodeId: number;
  page?: number;
  pageSize?: number;
  search?: string;
}

interface ListMappingsArgs {
  nodeId: number;
}

interface UpsertMappingArgs {
  nodeId: number;
  payload: {
    terminal_id: number;
    headwind_device_id: string;
    headwind_device_number?: string | null;
    headwind_device_name?: string | null;
    headwind_device_serial?: string | null;
    headwind_device_model?: string | null;
  };
}

interface RefreshMappingArgs {
  nodeId: number;
  terminalId: number;
}

interface DeleteMappingArgs {
  nodeId: number;
  terminalId: number;
}

const tagList = [{ type: "headwind-devices", id: "LIST" }] as const;

export const mdmApi = api.injectEndpoints({
  endpoints: (build) => ({
      listHeadwindDevices: build.query<HeadwindDeviceWithMapping[], ListDevicesArgs>({
        query: ({ nodeId, page = 0, pageSize = 100, search }) => ({
          url: `/mdm/devices`,
          params: {
            node_id: nodeId,
            page,
            page_size: pageSize,
            search,
          },
        }),
        providesTags: (result) => {
          const mappingTags =
            result
              ?.map((entry) => entry.mapping?.id)
              .filter((id): id is number => id != null)
              .map((id) => ({ type: "headwind-mappings" as const, id })) ?? [];
          return [...tagList, ...mappingTags];
        },
      }),
      listHeadwindMappings: build.query<HeadwindDeviceMappingWithTerminal[], ListMappingsArgs>({
        query: ({ nodeId }) => ({
          url: `/mdm/mappings`,
          params: { node_id: nodeId },
        }),
        providesTags: (result) =>
          result
            ? [
                { type: "headwind-mappings" as const, id: "LIST" },
                ...result.map((mapping) => ({ type: "headwind-mappings" as const, id: mapping.id })),
              ]
            : [{ type: "headwind-mappings" as const, id: "LIST" }],
      }),
      upsertHeadwindMapping: build.mutation<HeadwindDeviceMappingWithTerminal, UpsertMappingArgs>({
        query: ({ nodeId, payload }) => ({
          url: `/mdm/mappings`,
          method: "POST",
          params: { node_id: nodeId },
          body: payload,
        }),
        invalidatesTags: [{ type: "headwind-mappings", id: "LIST" }, { type: "headwind-devices", id: "LIST" }],
      }),
      refreshHeadwindMappingToken: build.mutation<HeadwindDeviceMappingWithTerminal, RefreshMappingArgs>({
        query: ({ nodeId, terminalId }) => ({
          url: `/mdm/mappings/${terminalId}/refresh-token`,
          method: "POST",
          params: { node_id: nodeId },
        }),
        invalidatesTags: () => [
          { type: "headwind-mappings", id: "LIST" },
          { type: "headwind-devices", id: "LIST" },
        ],
      }),
      deleteHeadwindMapping: build.mutation<void, DeleteMappingArgs>({
        query: ({ nodeId, terminalId }) => ({
          url: `/mdm/mappings/${terminalId}`,
          method: "DELETE",
          params: { node_id: nodeId },
        }),
        invalidatesTags: [{ type: "headwind-mappings", id: "LIST" }, { type: "headwind-devices", id: "LIST" }],
      }),
  }),
});

export const {
  useListHeadwindDevicesQuery,
  useListHeadwindMappingsQuery,
  useUpsertHeadwindMappingMutation,
  useRefreshHeadwindMappingTokenMutation,
  useDeleteHeadwindMappingMutation,
} = mdmApi;

