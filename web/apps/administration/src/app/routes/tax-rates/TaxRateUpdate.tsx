import { useUpdateTaxRateMutation, useGetTaxRateByNameQuery, selectTaxRateById } from "@api";
import * as React from "react";
import { TaxRateSchema } from "@stustapay/models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TaxRateChange } from "./TaxRateChange";
import { Loading } from "@stustapay/components";

export const TaxRateUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { taxRateName } = useParams();
  const { taxRate, isLoading, error } = useGetTaxRateByNameQuery(taxRateName as string, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      taxRate: data ? selectTaxRateById(data, taxRateName as string) : undefined,
    }),
  });
  const [updateTaxRate] = useUpdateTaxRateMutation();

  if (error) {
    return <Navigate to="/tax-rates" />;
  }

  if (isLoading || !taxRate) {
    return <Loading />;
  }

  return (
    <TaxRateChange
      headerTitle={t("updateTaxRate")}
      submitLabel={t("update")}
      initialValues={taxRate}
      validationSchema={TaxRateSchema}
      onSubmit={updateTaxRate}
    />
  );
};
