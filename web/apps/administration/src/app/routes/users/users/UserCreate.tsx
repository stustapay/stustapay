import { useCreateUserMutation } from "@/api";
import { UserRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewUser, NewUserSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { UserCreateForm } from "./UserCreateForm";
import { withPrivilegeGuard } from "@/app/layout";

const initialValues: NewUser = {
  login: "",
  display_name: "",
  description: "",
  password: "",
  user_tag_uid_hex: undefined,
  user_tag_pin: undefined,
};

export const UserCreate: React.FC = withPrivilegeGuard("user_management", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUser] = useCreateUserMutation();

  return (
    <CreateLayout
      title={t("createUser")}
      initialValues={initialValues}
      validationSchema={NewUserSchema}
      submitLabel={t("add")}
      successRoute={UserRoutes.list()}
      onSubmit={(u) => createUser({ nodeId: currentNode.id, createUserPayload: u })}
      form={UserCreateForm}
    />
  );
});
