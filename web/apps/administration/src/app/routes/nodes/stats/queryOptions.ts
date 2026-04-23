export const statsQueryOptions = (pollingIntervalMs = 0, enabled = true) => ({
  pollingInterval: enabled ? pollingIntervalMs : 0,
  refetchOnFocus: enabled && pollingIntervalMs > 0,
  refetchOnReconnect: enabled && pollingIntervalMs > 0,
  refetchOnMountOrArgChange: enabled && pollingIntervalMs > 0,
});
