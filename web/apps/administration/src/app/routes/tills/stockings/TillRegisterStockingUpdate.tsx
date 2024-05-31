import {
  selectTillRegisterStockingById,
  useListRegisterStockingsQuery,
  useUpdateRegisterStockingMutation,
} from "@/api";
import { TillStockingsRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { UpdateTillRegisterStockingSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillRegisterStockingForm } from "./TillRegisterStockingForm";
import { withPrivilegeGuard } from "@/app/layout";

export const TillRegisterStockingUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { stockingId } = useParams();
  const { stocking, isLoading, error } = useListRegisterStockingsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        stocking: data ? selectTillRegisterStockingById(data, Number(stockingId)) : undefined,
      }),
    }
  );
  const [updateStocking] = useUpdateRegisterStockingMutation();

  if (error) {
    return <Navigate to={TillStockingsRoutes.list()} />;
  }

  if (isLoading || !stocking) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("profile.update")}
      submitLabel={t("update")}
      successRoute={TillStockingsRoutes.list()}
      initialValues={stocking}
      validationSchema={UpdateTillRegisterStockingSchema}
      onSubmit={(s) => updateStocking({ nodeId: currentNode.id, stockingId: stocking.id, newCashRegisterStocking: s })}
      form={TillRegisterStockingForm}
    />
  );
});
