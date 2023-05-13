import * as React from "react";
import { TaxRate, TaxRateSchema } from "@stustapay/models";
import { useCreateTaxRateMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TaxRateChange } from "./TaxRateChange";

const initialValues: TaxRate = {
  name: "",
  rate: 0,
  description: "",
};

export const TaxRateCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createTaxRate] = useCreateTaxRateMutation();

  return (
    <TaxRateChange
      headerTitle={t("createTaxRate")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={TaxRateSchema}
      onSubmit={createTaxRate}
    />
  );
};
