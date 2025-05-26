import { useCreateRegisterStockingMutation } from "@/api";
import { TillStockingsRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewCashRegisterStocking, NewCashRegisterStockingSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { CashRegisterStockingForm } from "./CashRegisterStockingForm";
import { withPrivilegeGuard } from "@/app/layout";

const initialValues: NewCashRegisterStocking = {
  name: "",
  euro200: 0,
  euro100: 0,
  euro50: 0,
  euro20: 0,
  euro10: 0,
  euro5: 0,
  euro2: 0,
  euro1: 0,
  cent50: 0,
  cent20: 0,
  cent10: 0,
  cent5: 0,
  cent2: 0,
  cent1: 0,
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
