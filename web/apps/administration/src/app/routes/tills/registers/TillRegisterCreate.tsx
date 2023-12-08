import { useCreateRegisterMutation } from "@/api";
import { TillRegistersRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewTillRegister, NewTillRegisterSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillRegisterForm } from "./TillRegisterForm";
import { withPrivilegeGuard } from "@/app/layout";

const initialValues: NewTillRegister = {
  name: "",
};

export const TillRegisterCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createRegister] = useCreateRegisterMutation();

  return (
    <CreateLayout
      title={t("register.createRegister")}
      submitLabel={t("add")}
      successRoute={TillRegistersRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillRegisterSchema}
      onSubmit={(register) => createRegister({ nodeId: currentNode.id, newCashRegister: register })}
      form={TillRegisterForm}
    />
  );
});
