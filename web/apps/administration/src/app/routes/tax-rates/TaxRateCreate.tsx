import { useCreateTaxRateMutation } from "@/api";
import { TaxRateRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
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
  const { currentNode } = useCurrentNode();
  const [createTaxRate] = useCreateTaxRateMutation();

  return (
    <CreateLayout
      title={t("createTaxRate")}
      successRoute={TaxRateRoutes.list()}
      initialValues={initialValues}
      validationSchema={TaxRateSchema}
      onSubmit={(taxRate) => createTaxRate({ nodeId: currentNode.id, newTaxRate: taxRate })}
      form={TaxRateForm}
    />
  );
};
