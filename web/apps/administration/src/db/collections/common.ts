export const commonQueryCollectionOptions = {
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

let lastId = 1_000_000_000;

export const generateId = () => {
  lastId++;
  return lastId;
};
