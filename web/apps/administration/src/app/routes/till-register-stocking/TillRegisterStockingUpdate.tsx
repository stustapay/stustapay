import { selectTillRegisterStockingById, useListRegisterStockingsQuery, useUpdateRegisterStockingMutation } from "@api";
import * as React from "react";
import { UpdateTillRegisterStockingSchema } from "@stustapay/models";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { TillRegisterStockingChange } from "./TillRegisterStockingChange";

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
    return <Navigate to="/till-register-stockings" />;
  }

  if (isLoading || !stocking) {
    return <Loading />;
  }

  return (
    <TillRegisterStockingChange
      headerTitle={t("profile.update")}
      submitLabel={t("update")}
      initialValues={stocking}
      validationSchema={UpdateTillRegisterStockingSchema}
      onSubmit={(stocking) => updateStocking({ stockingId: stocking.id, newCashRegisterStocking: stocking })}
    />
  );
};
