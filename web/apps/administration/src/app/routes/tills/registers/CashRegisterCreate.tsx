import { NewCashRegister, NewCashRegisterSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { CashRegistersRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getCashRegisterCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { CashRegisterForm } from "./CashRegisterForm";

const initialValues: NewCashRegister = {
  name: "",
};

export const CashRegisterCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("register.createRegister")}
      successRoute={CashRegistersRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewCashRegisterSchema}
      onSubmit={(register) =>
        getCashRegisterCollection(currentNode.id).insert({
          ...register,
          id: generateId(),
          node_id: currentNode.id,
          current_cashier_id: null,
          current_till_id: null,
          balance: 0,
          account_id: 0,
        })
      }
      form={CashRegisterForm}
    />
  );
});
