import { Paper } from "@mui/material";
import { EventPrivilege, NodePrivilege } from "@stustapay/models";
import * as React from "react";

import { PrivilegeList } from "./PrivilegeList";

export type PrivilegeDetailSectionProps = {
  title: string;
  privileges: readonly (EventPrivilege | NodePrivilege)[];
};

export const PrivilegeDetailSection: React.FC<PrivilegeDetailSectionProps> = ({ title, privileges }) => {
  return (
    <Paper>
      <PrivilegeList title={title} privileges={privileges} />
    </Paper>
  );
};
