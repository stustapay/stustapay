import * as React from "react";
import { TaxRate } from "../../../models/taxRate";
import { useCreateTaxRateMutation } from "../../../api";
import { useTranslation } from "react-i18next";
import { TaxRateChange } from "./TaxRateChange";

const initialValues: TaxRate = {
  name: "",
  rate: 0,
  description: "",
};

export const TaxRateCreate: React.FC = () => {
  const { t } = useTranslation(["taxRates", "common"]);
  const [createTaxRate] = useCreateTaxRateMutation();

  return (
    <TaxRateChange
      headerTitle={t("createTaxRate")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      onSubmit={createTaxRate}
    />
  );
};
