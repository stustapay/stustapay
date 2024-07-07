import * as React from "react";
import { Show, ShowProps, TopToolbar } from "react-admin";
import { EditButton } from "./EditButton";

export type NodeResourceShowProps = ShowProps;

const Actions = () => {
  return (
    <TopToolbar>
      <EditButton />
    </TopToolbar>
  );
};

export const NodeResourceShow: React.FC<NodeResourceShowProps> = (props) => {
  return <Show actions={<Actions />} {...props} />;
};
