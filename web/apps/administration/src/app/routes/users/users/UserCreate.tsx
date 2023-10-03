import { useCreateUserMutation } from "@/api";
import { UserRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewUser, NewUserSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { UserCreateForm } from "./UserCreateForm";

const initialValues: NewUser = {
  login: "",
  display_name: "",
  description: "",
  password: "",
  role_names: [],
};

export const UserCreate: React.FC = () => {
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
};
