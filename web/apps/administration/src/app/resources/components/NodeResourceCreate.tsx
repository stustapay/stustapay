import * as React from "react";
import { Create, CreateProps, Identifier, RaRecord } from "react-admin";

export type NodeResourceCreateProps = CreateProps;

export const NodeResourceCreate: React.FC<NodeResourceCreateProps> = ({ redirect = "list", ...props }) => {
  const handleRedirect = React.useCallback(
    (resource?: string, id?: Identifier, data?: Partial<RaRecord>) => {
      if (!data || !resource || !id) {
        console.warn("Invalid redireect after node resource create");
        return `/`;
      }
      if (redirect === "list") {
        return `/nodes/${data.node_id}/${resource}`;
      }
      if (redirect === "edit") {
        return `/nodes/${data.node_id}/${resource}/${id}`;
      }
      if (redirect === "show") {
        return `/nodes/${data.node_id}/${resource}/${id}/show`;
      }
      console.error("unknown redirect specified");
      return `/`;
    },
    [redirect]
  );

  return <Create {...props} redirect={handleRedirect} />;
};
