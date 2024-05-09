import { selectUserRoleById, useListUserRolesQuery } from "@/api";
import { UserRoleRoutes } from "@/app/routes";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Edit as EditIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const UserRoleDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { roleId } = useParams();
  const navigate = useNavigate();
  const { role, error } = useListUserRolesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        role: data ? selectUserRoleById(data, Number(roleId)) : undefined,
      }),
    }
  );

  if (error) {
    return <Navigate to={UserRoleRoutes.list()} />;
  }

  if (role === undefined) {
    return <Loading />;
  }

  return (
    <DetailLayout
      title={role.name}
      routes={UserRoleRoutes}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(UserRoleRoutes.edit(roleId)),
          color: "primary",
          icon: <EditIcon />,
        },
      ]}
    >
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("userRole.name")} secondary={role.name} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("userRole.isPrivileged")}
              secondary={role.is_privileged ? t("common.yes") : t("common.no")}
            />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("userRole.privileges")} secondary={role.privileges.join(", ")} />
          </ListItem>
        </List>
      </Paper>
    </DetailLayout>
  );
};
