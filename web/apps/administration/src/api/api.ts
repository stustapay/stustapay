import { createEntityAdapter } from "@reduxjs/toolkit";

import {
  UserTagDetailRead,
  api as generatedApi,
  GenerateTestRevenueReportApiArg,
  GenerateRevenueReportApiArg,
  GenerateTestDailyReportApiArg,
  GeneratePayoutReportApiArg,
  GenerateDailyReportApiArg,
  ExportDsfinvkApiArg,
  ExportAo146AApiArg,
} from "./generated/api";
import {
  convertEntityAdaptorSelectors,
  blobResponseHandler,
  blobUrlResponseHandler,
} from "./utils";

export * from "./generated/api";

const userTagAdapter = createEntityAdapter<UserTagDetailRead>({
  sortComparer: (a, b) => a.pin.toLowerCase().localeCompare(b.pin.toLowerCase()),
});

export const api = generatedApi.enhanceEndpoints({
  endpoints: {
    generateTestRevenueReport: {
      query: (queryArg: GenerateTestRevenueReportApiArg) => ({
        url: `/tree/events/${queryArg.nodeId}/generate-test-revenuereport`,
        method: "POST",
        responseHandler: blobUrlResponseHandler,
      }),
      invalidatesTags: [],
    },
    generateRevenueReport: {
      query: (queryArg: GenerateRevenueReportApiArg) => ({
        url: `/tree/nodes/${queryArg.nodeId}/generate-revenue-report`,
        method: "POST",
        responseHandler: blobUrlResponseHandler,
      }),
      invalidatesTags: [],
    },
    generateTestDailyReport: {
      query: (queryArg: GenerateTestDailyReportApiArg) => ({
        url: `/tree/events/${queryArg.nodeId}/generate-test-daily-report`,
        method: "POST",
        responseHandler: blobUrlResponseHandler,
      }),
      invalidatesTags: [],
    },
    generateDailyReport: {
      query: (queryArg: GenerateDailyReportApiArg) => ({
        url: `/tree/nodes/${queryArg.nodeId}/generate-daily-report`,
        method: "POST",
        body: queryArg.generateDailyReportPayload,
        responseHandler: blobUrlResponseHandler,
      }),
      invalidatesTags: [],
    },
    generatePayoutReport: {
      query: (queryArg: GeneratePayoutReportApiArg) => ({
        url: `/tree/nodes/${queryArg.nodeId}/generate-payout-report`,
        method: "POST",
        responseHandler: blobUrlResponseHandler,
      }),
      invalidatesTags: [],
    },
    exportDsfinvk: {
      query: (queryArg: ExportDsfinvkApiArg) => ({
        url: `/tree/events/${queryArg.nodeId}/export-dsfinvk`,
        method: "POST",
        responseHandler: blobResponseHandler,
      }),
      invalidatesTags: [],
    },
    exportAo146A: {
      query: (queryArg: ExportAo146AApiArg) => ({
        url: `/tree/events/${queryArg.nodeId}/export-ao146a`,
        method: "POST",
        body: queryArg.ao146AExportPayload,
        responseHandler: blobResponseHandler,
      }),
      invalidatesTags: [],
    },
    switchCustomerTag: {
      invalidatesTags: ["accounts", "user_tags"],
    },
  },
});

export const {
  selectUserTagAll,
  selectUserTagEntities,
  selectUserTagTotal,
  selectUserTagIds,
  selectUserTagById,
} = convertEntityAdaptorSelectors("UserTag", userTagAdapter.getSelectors());
