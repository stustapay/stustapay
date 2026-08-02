import { NewUser, NewUserSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { UserRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getUserCollection } from "@/db/collections";
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

  return (
    <CreateLayoutV2
      title={t("createUser")}
      initialValues={initialValues}
      validationSchema={NewUserSchema}
      successRoute={UserRoutes.list()}
      onSubmit={(user) =>
        getUserCollection(currentNode.id).insert({
          ...user,
          id: generateId(),
          node_id: currentNode.id,
          user_tag_id: null,
          user_tag_uid: null,
          user_tag_uid_hex: null,
          transport_account_id: null,
          cash_register_id: null,
          cash_drawer_balance: null,
          terminal_ids: [],
        })
      }
      form={UserCreateForm}
    />
  );
});
