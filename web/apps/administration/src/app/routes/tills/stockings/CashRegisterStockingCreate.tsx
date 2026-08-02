import { NewCashRegisterStockingSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { TillStockingsRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { NewCashRegisterStocking } from "@/db/api/generated";
import { generateId, getCashRegisterStockingCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { CashRegisterStockingForm } from "./CashRegisterStockingForm";
import { computeStockingTotal, defaultCashRegisterStockingDenominationValues } from "./stockingDenominations";

const initialValues: NewCashRegisterStocking = {
  name: "",
  ...defaultCashRegisterStockingDenominationValues,
  variable_in_euro: 0,
};

export const CashRegisterStockingCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("register.createStocking")}
      successRoute={TillStockingsRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewCashRegisterStockingSchema}
      onSubmit={(stocking) =>
        getCashRegisterStockingCollection(currentNode.id).insert({
          ...stocking,
          id: generateId(),
          node_id: currentNode.id,
          total: computeStockingTotal(stocking),
        })
      }
      form={CashRegisterStockingForm}
    />
  );
});
