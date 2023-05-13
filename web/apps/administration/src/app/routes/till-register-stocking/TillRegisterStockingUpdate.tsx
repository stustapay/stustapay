import {
  selectTillRegisterStockingById,
  useGetTillRegisterStockingsQuery,
  useUpdateTillRegisterStockingMutation,
} from "@api";
import * as React from "react";
import { UpdateTillRegisterStockingSchema } from "@stustapay/models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { TillRegisterStockkingChange } from "./TillRegisterStockingChange";

export const TillRegisterStockingUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { stockingId } = useParams();
  const { stocking, isLoading, error } = useGetTillRegisterStockingsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      stocking: data ? selectTillRegisterStockingById(data, Number(stockingId)) : undefined,
    }),
  });
  const [updateStocking] = useUpdateTillRegisterStockingMutation();

  if (error) {
    return <Navigate to="/till-register-stockings" />;
  }

  if (isLoading || !stocking) {
    return <Loading />;
  }

  return (
    <TillRegisterStockkingChange
      headerTitle={t("profile.update")}
      submitLabel={t("update")}
      initialValues={stocking}
      validationSchema={UpdateTillRegisterStockingSchema}
      onSubmit={updateStocking}
    />
  );
};
