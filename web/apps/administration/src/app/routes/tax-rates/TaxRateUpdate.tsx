import { useUpdateTaxRateMutation, useGetTaxRateByNameQuery, selectTaxRateById } from "@api";
import * as React from "react";
import { TaxRateSchema } from "@stustapay/models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TaxRateChange } from "./TaxRateChange";
import { Loading } from "@stustapay/components";

export const TaxRateUpdate: React.FC = () => {
  const { t } = useTranslation(["taxRates", "common"]);
  const { taxRateName } = useParams();
  const { taxRate, isLoading } = useGetTaxRateByNameQuery(taxRateName as string, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      taxRate: data ? selectTaxRateById(data, taxRateName as string) : undefined,
    }),
  });
  const [updateTaxRate] = useUpdateTaxRateMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!taxRate) {
    return <Navigate to="/tax-rates" />;
  }

  return (
    <TaxRateChange
      headerTitle={t("updateTaxRate")}
      submitLabel={t("update", { ns: "common" })}
      initialValues={taxRate}
      validationSchema={TaxRateSchema}
      onSubmit={updateTaxRate}
    />
  );
};
