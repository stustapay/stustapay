import { config } from "@/api/common";

export const getBlobUrl = (blobId?: string | null) => {
  if (!blobId) {
    return undefined;
  }
  return `${config.adminApiBaseUrl}/media/blob/${blobId}`;
};
