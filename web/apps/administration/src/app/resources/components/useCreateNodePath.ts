import * as React from "react";
import { CreatePathParams as RaCreatePathParams, removeDoubleSlashes, useBasename } from "react-admin";
import { useParams } from "react-router-dom";

export type CreatePathParams = RaCreatePathParams & {
  nodeId?: string | number;
};

export const useCreateNodePath = () => {
  const basename = useBasename();
  const { nodeId: routeNodeId } = useParams();
  return React.useCallback(
    ({ resource, id, type, nodeId }: CreatePathParams): string => {
      const actualNodeId = nodeId ?? routeNodeId;
      if (actualNodeId == null) {
        throw new Error("Cannot create a link to a node resource from outside a node resource route");
      }
      if (["list", "create", "edit", "show"].includes(type) && !resource) {
        throw new Error("Cannot create a link without a resource. You must provide the resource name.");
      }
      switch (type) {
        case "list":
          return removeDoubleSlashes(`${basename}/nodes/${actualNodeId}/${resource}`);
        case "create":
          return removeDoubleSlashes(`${basename}/nodes/${actualNodeId}/${resource}/create`);
        case "edit": {
          if (id == null) {
            // maybe the id isn't defined yet
            // instead of throwing an error, fallback to list link
            return removeDoubleSlashes(`${basename}/nodes/${actualNodeId}/${resource}`);
          }
          return removeDoubleSlashes(`${basename}/nodes/${actualNodeId}/${resource}/${encodeURIComponent(id)}`);
        }
        case "show": {
          if (id == null) {
            // maybe the id isn't defined yet
            // instead of throwing an error, fallback to list link
            return removeDoubleSlashes(`${basename}/nodes/${actualNodeId}/${resource}`);
          }
          return removeDoubleSlashes(`${basename}/nodes/${actualNodeId}/${resource}/${encodeURIComponent(id)}/show`);
        }
        default:
          return type;
      }
    },
    [basename, routeNodeId]
  );
};
