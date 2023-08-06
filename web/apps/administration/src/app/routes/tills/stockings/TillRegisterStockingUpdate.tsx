import {
  selectTillRegisterStockingById,
  useListRegisterStockingsQuery,
  useUpdateRegisterStockingMutation,
} from "@/api";
import { TillStockingsRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { Loading } from "@stustapay/components";
import { UpdateTillRegisterStockingSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillRegisterStockingForm } from "./TillRegisterStockingForm";

export const TillRegisterStockingUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { stockingId } = useParams();
  const { stocking, isLoading, error } = useListRegisterStockingsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      stocking: data ? selectTillRegisterStockingById(data, Number(stockingId)) : undefined,
    }),
  });
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
      successRoute={TillStockingsRoutes.detail(stocking.id)}
      initialValues={stocking}
      validationSchema={UpdateTillRegisterStockingSchema}
      onSubmit={(s) => updateStocking({ stockingId: stocking.id, newCashRegisterStocking: s })}
      form={TillRegisterStockingForm}
    />
  );
};
