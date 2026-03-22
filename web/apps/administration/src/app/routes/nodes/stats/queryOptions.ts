export const statsQueryOptions = (pollingIntervalMs = 0) => ({
  pollingInterval: pollingIntervalMs,
  refetchOnFocus: pollingIntervalMs > 0,
  refetchOnReconnect: pollingIntervalMs > 0,
  refetchOnMountOrArgChange: pollingIntervalMs > 0,
});
