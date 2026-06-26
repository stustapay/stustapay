import { List, ListItem, ListItemText, ListSubheader } from "@mui/material";
import { EventPrivilege, NodePrivilege } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { usePrivilegeTranslations } from "@/hooks";

export type PrivilegeListProps = {
  title: string;
  privileges: readonly (EventPrivilege | NodePrivilege)[];
};

export const PrivilegeList: React.FC<PrivilegeListProps> = ({ title, privileges }) => {
  const { t } = useTranslation();
  const { getPrivilegeName, getPrivilegeDescription } = usePrivilegeTranslations();

  return (
    <List
      dense
      subheader={
        <ListSubheader component="div" disableSticky>
          {title}
        </ListSubheader>
      }
    >
      {privileges.length === 0 ? (
        <ListItem>
          <ListItemText secondary={t("privilege.noneAssigned")} />
        </ListItem>
      ) : (
        privileges.map((privilege) => (
          <ListItem key={privilege}>
            <ListItemText primary={getPrivilegeName(privilege)} secondary={getPrivilegeDescription(privilege)} />
          </ListItem>
        ))
      )}
    </List>
  );
};
