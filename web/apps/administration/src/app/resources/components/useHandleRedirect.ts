import * as React from "react";
import { Identifier, RaRecord } from "react-admin";

export const useHandleRedirect = (type = "list") => {
  return React.useCallback(
    (resource?: string, id?: Identifier, data?: Partial<RaRecord>) => {
      if (!data || !resource || !id) {
        console.warn("Invalid redirect after node resource create");
        return `/`;
      }
      // TODO: figure out why the first "nodes" part of the url gets swallowed
      if (type === "list") {
        console.log("redirect list");
        return `/nodes/nodes/${data.node_id}/${resource}`;
      }
      if (type === "edit") {
        console.log("redirect edit");
        return `/nodes/nodes/${data.node_id}/${resource}/${id}`;
      }
      if (type === "show") {
        console.log("redirect show", data.node_id, resource, id);
        return `/nodes/nodes/${data.node_id}/${resource}/${id}/show`;
      }
      console.error("unknown redirect specified");
      return `/`;
    },
    [type]
  );
};
