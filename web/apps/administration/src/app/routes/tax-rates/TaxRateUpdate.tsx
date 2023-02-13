import { useUpdateTaxRateMutation, useGetTaxRateByNameQuery } from "@api";
import * as React from "react";
import { TaxRateSchema } from "../../../models/taxRate";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TaxRateChange } from "./TaxRateChange";
import { Loading } from "@components/Loading";

export const TaxRateUpdate: React.FC = () => {
  const { t } = useTranslation(["taxRates", "common"]);
  const { taxRateName } = useParams();
  const { data: taxRate, isLoading } = useGetTaxRateByNameQuery(taxRateName as string);
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
