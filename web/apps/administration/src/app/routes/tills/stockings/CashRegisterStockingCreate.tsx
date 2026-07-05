import { NewCashRegisterStocking, NewCashRegisterStockingSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateRegisterStockingMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { TillStockingsRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { CashRegisterStockingForm } from "./CashRegisterStockingForm";
import { defaultCashRegisterStockingDenominationValues } from "./stockingDenominations";

const initialValues: NewCashRegisterStocking = {
  name: "",
  ...defaultCashRegisterStockingDenominationValues,
  variable_in_euro: 0,
};

export const CashRegisterStockingCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createStocking] = useCreateRegisterStockingMutation();

  return (
    <CreateLayout
      title={t("register.createStocking")}
      successRoute={TillStockingsRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewCashRegisterStockingSchema}
      onSubmit={(stocking) => createStocking({ nodeId: currentNode.id, newCashRegisterStocking: stocking })}
      form={CashRegisterStockingForm}
    />
  );
});
