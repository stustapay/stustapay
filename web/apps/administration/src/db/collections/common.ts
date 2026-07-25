import * as React from "react";

import type { PaginatedListOrder, PaginatedListTransaction } from "../api/generated";
import { queryClient } from "./api";

export const commonQueryCollectionOptions = {
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export const DEFAULT_PAGE_SIZE = 100;

let lastId = 1_000_000_000;

export const generateId = () => {
  lastId++;
  return lastId;
};

export const refetchNodeCollection = (nodeId: number, resource: string) =>
  queryClient.invalidateQueries({ queryKey: ["nodes", nodeId, resource] });

export const refetchTillTerminalCollections = (nodeId: number) =>
  Promise.all([refetchNodeCollection(nodeId, "tills"), refetchNodeCollection(nodeId, "terminals")]);

export const usePaginatedQueryTotal = (nodeId: number, resource: "orders" | "transactions") => {
  const readTotal = React.useCallback(() => {
    const queries = queryClient.getQueryCache().findAll({ queryKey: ["nodes", nodeId, resource] });
    for (const query of [...queries].reverse()) {
      const data = query.state.data as PaginatedListOrder | PaginatedListTransaction | undefined;
      if (data && "total" in data) {
        return data.total;
      }
    }
    return 0;
  }, [nodeId, resource]);

  const [total, setTotal] = React.useState(readTotal);

  React.useEffect(() => {
    setTotal(readTotal());
    return queryClient.getQueryCache().subscribe(() => {
      setTotal(readTotal());
    });
  }, [readTotal]);

  return total;
};
