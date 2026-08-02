import { Loading } from "@stustapay/components";
import { UpdateCashRegisterStockingSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TillStockingsRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getCashRegisterStockingCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { CashRegisterStockingForm } from "./CashRegisterStockingForm";
import { cashRegisterStockingDenominationFields, computeStockingTotal } from "./stockingDenominations";

export const CashRegisterStockingUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { stockingId } = useParams();
  const {
    data: stocking,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ stockings: getCashRegisterStockingCollection(currentNode.id) })
        .where(({ stockings }) => eq(stockings.id, Number(stockingId)))
        .findOne(),
    [currentNode.id, stockingId]
  );

  if (isError) {
    return <Navigate to={TillStockingsRoutes.list()} />;
  }

  if (isLoading || !stocking) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("profile.update")}
      successRoute={TillStockingsRoutes.detail(stocking.id)}
      initialValues={stocking}
      validationSchema={UpdateCashRegisterStockingSchema}
      onSubmit={(updatedStocking) =>
        getCashRegisterStockingCollection(currentNode.id).update(stocking.id, (draft) => {
          draft.name = updatedStocking.name;
          for (const field of cashRegisterStockingDenominationFields) {
            draft[field] = updatedStocking[field];
          }
          draft.variable_in_euro = updatedStocking.variable_in_euro;
          draft.total = computeStockingTotal(updatedStocking);
        })
      }
      form={CashRegisterStockingForm}
    />
  );
});
