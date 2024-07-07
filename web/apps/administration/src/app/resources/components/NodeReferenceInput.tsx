import * as React from "react";
import { ReferenceInput, ReferenceInputProps } from "react-admin";
import { useParams } from "react-router-dom";

export type NodeReferenceInputProps = ReferenceInputProps;

export const NodeReferenceInput: React.FC<NodeReferenceInputProps> = (props) => {
  const { nodeId } = useParams();
  return <ReferenceInput {...props} filter={{ ...props.filter, nodeId }} />;
};
