import * as React from "react";
import { ChipField, ReferenceArrayField, ReferenceArrayFieldProps, SingleFieldList } from "react-admin";
import { useCreateNodePath } from "./useCreateNodePath";

export type NodeReferenceArrayFieldProps = ReferenceArrayFieldProps;

// TODO: rewrite this to make node resource linking work properly

export const NodeReferenceArrayField: React.FC<NodeReferenceArrayFieldProps> = ({ children, ...props }) => {
  return (
    <ReferenceArrayField {...props}>
      <SingleFieldList>
        <ChipField source="name" clickable />
      </SingleFieldList>
    </ReferenceArrayField>
  );
};
