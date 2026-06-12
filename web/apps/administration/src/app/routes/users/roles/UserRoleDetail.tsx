import { Edit as EditIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { selectUserRoleById, useListUserRolesQuery } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { UserRoleRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";

export const UserRoleDetail: React.FC = withPrivilegeGuard("node_administration", () => {
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
      <DetailView>
        <DetailField label={t("userRole.name")} value={role.name} />
        <DetailField label={t("userRole.isPrivileged")} value={role.is_privileged ? t("common.yes") : t("common.no")} />
        <DetailField label={t("userRole.eventPrivileges")} value={role.event_privileges.join(", ")} />
        <DetailField label={t("userRole.nodePrivileges")} value={role.node_privileges.join(", ")} />
      </DetailView>
    </DetailLayout>
  );
});
