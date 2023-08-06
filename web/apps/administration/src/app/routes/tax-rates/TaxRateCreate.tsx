import { TaxRateRoutes } from "@/app/routes";
import { useCreateTaxRateMutation } from "@api";
import { CreateLayout } from "@components";
import { TaxRate, TaxRateSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TaxRateForm } from "./TaxRateForm";

const initialValues: TaxRate = {
  name: "",
  rate: 0,
  description: "",
};

export const TaxRateCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createTaxRate] = useCreateTaxRateMutation();

  return (
    <CreateLayout
      title={t("createTaxRate")}
      submitLabel={t("add")}
      successRoute={TaxRateRoutes.list()}
      initialValues={initialValues}
      validationSchema={TaxRateSchema}
      onSubmit={(taxRate) => createTaxRate({ taxRate })}
      form={TaxRateForm}
    />
  );
};
