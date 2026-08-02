import { Edit as EditIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { UserRoleRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { getUserRoleCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { PrivilegeDetailSection } from "./components/PrivilegeDetailSection";

export const UserRoleDetail: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { roleId } = useParams();
  const navigate = useNavigate();
  const {
    data: role,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ userRoles: getUserRoleCollection(currentNode.id) })
        .where(({ userRoles }) => eq(userRoles.id, Number(roleId)))
        .findOne(),
    [currentNode.id, roleId]
  );

  if (isError) {
    return <Navigate to={UserRoleRoutes.list()} />;
  }

  if (isLoading || !role) {
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
        <DetailField
          label={t("userRole.canAssignAllRoles")}
          helpText={t("userRole.canAssignAllRolesDescription")}
          value={role.can_assign_all_roles ? t("common.yes") : t("common.no")}
        />
        {!role.can_assign_all_roles && (
          <DetailField
            label={t("userRole.assignableRoles")}
            value={
              (role.assignable_role_ids ?? []).length > 0
                ? (role.assignable_role_ids ?? []).join(", ")
                : t("common.none")
            }
          />
        )}
      </DetailView>
      <PrivilegeDetailSection title={t("userRole.eventPrivileges")} privileges={role.event_privileges} />
      <PrivilegeDetailSection title={t("userRole.nodePrivileges")} privileges={role.node_privileges} />
    </DetailLayout>
  );
});
