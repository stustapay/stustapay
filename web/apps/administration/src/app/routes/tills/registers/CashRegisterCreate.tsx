import { useCreateRegisterMutation } from "@/api";
import { CashRegistersRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewCashRegister, NewCashRegisterSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { CashRegisterForm } from "./CashRegisterForm";
import { withPrivilegeGuard } from "@/app/layout";

const initialValues: NewCashRegister = {
  name: "",
};

export const CashRegisterCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createRegister] = useCreateRegisterMutation();

  return (
    <CreateLayout
      title={t("register.createRegister")}
      successRoute={CashRegistersRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewCashRegisterSchema}
      onSubmit={(register) => createRegister({ nodeId: currentNode.id, newCashRegister: register })}
      form={CashRegisterForm}
    />
  );
});
