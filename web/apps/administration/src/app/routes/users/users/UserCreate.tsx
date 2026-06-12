import { NewUser, NewUserSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateUserMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { UserRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { UserCreateForm } from "./UserCreateForm";

const initialValues: NewUser = {
  login: "",
  display_name: "",
  description: "",
  password: "",
  user_tag_uid_hex: undefined,
  user_tag_pin: undefined,
};

export const UserCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUser] = useCreateUserMutation();

  return (
    <CreateLayout
      title={t("createUser")}
      initialValues={initialValues}
      validationSchema={NewUserSchema}
      successRoute={UserRoutes.list()}
      onSubmit={(u) => createUser({ nodeId: currentNode.id, createUserPayload: u })}
      form={UserCreateForm}
    />
  );
});
