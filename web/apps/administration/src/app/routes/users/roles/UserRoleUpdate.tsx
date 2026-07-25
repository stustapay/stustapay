import { Loading } from "@stustapay/components";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { UserRoleRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getUserRoleCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UserRoleUpdateForm, UserRoleUpdateSchema, UserRoleUpdate as UserRoleUpdateType } from "./UserRoleUpdateForm";

export const UserRoleUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { roleId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: userRole,
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

  if (isLoading || !userRole) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("userRole.update")}
      successRoute={UserRoleRoutes.list()}
      initialValues={userRole as UserRoleUpdateType}
      validationSchema={UserRoleUpdateSchema}
      onSubmit={(updatedRole) =>
        getUserRoleCollection(currentNode.id).update(userRole.id, (draft) => {
          draft.can_assign_all_roles = updatedRole.can_assign_all_roles;
          draft.assignable_role_ids = updatedRole.assignable_role_ids;
          draft.event_privileges = updatedRole.event_privileges;
          draft.node_privileges = updatedRole.node_privileges;
        })
      }
      form={UserRoleUpdateForm}
    />
  );
});
