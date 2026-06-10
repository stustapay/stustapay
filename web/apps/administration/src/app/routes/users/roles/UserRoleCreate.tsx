import { NewUserRole, NewUserRoleSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateUserRoleMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { UserRoleRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { UserRoleForm } from "./UserRoleForm";

const initialValues: NewUserRole = {
  name: "",
  is_privileged: false,
  privileges: [],
};

export const UserRoleCreate: React.FC = withPrivilegeGuard("user_management", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUserRole] = useCreateUserRoleMutation();

  return (
    <CreateLayout
      title={t("userRole.create")}
      initialValues={initialValues}
      successRoute={UserRoleRoutes.list()}
      onSubmit={(r) => createUserRole({ nodeId: currentNode.id, newUserRole: r })}
      validationSchema={NewUserRoleSchema}
      form={UserRoleForm}
    />
  );
});
