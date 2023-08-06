import { useCreateUserRoleMutation } from "@/api";
import { UserRoleRoutes } from "@/app/routes";
import { CreateLayout } from "@components";
import { NewUserRole, NewUserRoleSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { UserRoleForm } from "./UserRoleForm";

const initialValues: NewUserRole = {
  name: "",
  is_privileged: false,
  privileges: [],
};

export const UserRoleCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createUserRole] = useCreateUserRoleMutation();

  return (
    <CreateLayout
      title={t("userRole.create")}
      initialValues={initialValues}
      submitLabel={t("add")}
      successRoute={UserRoleRoutes.list()}
      onSubmit={(r) => createUserRole({ newUserRole: r })}
      validationSchema={NewUserRoleSchema}
      form={UserRoleForm}
    />
  );
};
