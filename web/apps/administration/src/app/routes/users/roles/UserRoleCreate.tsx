import { NewUserRole, NewUserRoleSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { UserRoleRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getUserRoleCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UserRoleForm } from "./UserRoleForm";

const initialValues: NewUserRole = {
  name: "",
  can_assign_all_roles: false,
  assignable_role_ids: [],
  event_privileges: [],
  node_privileges: [],
};

export const UserRoleCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("userRole.create")}
      initialValues={initialValues}
      successRoute={UserRoleRoutes.list()}
      onSubmit={(role) =>
        getUserRoleCollection(currentNode.id).insert({
          name: role.name,
          can_assign_all_roles: role.can_assign_all_roles ?? false,
          assignable_role_ids: role.assignable_role_ids ?? [],
          event_privileges: role.event_privileges,
          node_privileges: role.node_privileges,
          id: generateId(),
          node_id: currentNode.id,
        })
      }
      validationSchema={NewUserRoleSchema}
      form={UserRoleForm}
    />
  );
});
