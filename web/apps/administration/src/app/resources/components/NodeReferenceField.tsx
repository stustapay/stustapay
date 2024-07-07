import * as React from "react";
import { ReferenceField, ReferenceFieldProps } from "react-admin";
import { useCreateNodePath } from "./useCreateNodePath";

export type NodeReferenceFieldProps = ReferenceFieldProps;

export const NodeReferenceField: React.FC<NodeReferenceFieldProps> = (props) => {
  const createPath = useCreateNodePath();
  return (
    <ReferenceField
      {...props}
      link={(element, reference) => {
        return createPath({ resource: reference, type: "show", nodeId: element.node_id, id: element.id });
      }}
    />
  );
};
