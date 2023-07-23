import { useGetTaxRateQuery, useUpdateTaxRateMutation } from "@api";
import * as React from "react";
import { TaxRateSchema } from "@stustapay/models";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TaxRateChange } from "./TaxRateChange";
import { Loading } from "@stustapay/components";

export const TaxRateUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { taxRateName } = useParams();
  const { data: taxRate, isLoading, error } = useGetTaxRateQuery({ taxRateName: taxRateName as string });
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
      onSubmit={(taxRate) => updateTaxRate({ taxRateName: taxRate.name, taxRateWithoutName: taxRate })}
    />
  );
};
