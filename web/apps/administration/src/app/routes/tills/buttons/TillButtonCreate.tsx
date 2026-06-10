import { NewTillButton, NewTillButtonSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateTillButtonMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { TillButtonsRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { TillButtonForm } from "./TillButtonForm";

const initialValues: NewTillButton = {
  name: "",
  product_ids: [],
};

export const TillButtonCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createTillButton] = useCreateTillButtonMutation();

  return (
    <CreateLayout
      title={t("button.create")}
      successRoute={TillButtonsRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillButtonSchema}
      onSubmit={(button) => createTillButton({ nodeId: currentNode.id, newTillButton: button })}
      form={TillButtonForm}
    />
  );
});
