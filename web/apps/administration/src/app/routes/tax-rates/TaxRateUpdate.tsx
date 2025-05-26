import { TaxRate, useGetTaxRateQuery, useUpdateTaxRateMutation } from "@/api";
import { TaxRateRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { TaxRateSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TaxRateForm } from "./TaxRateForm";

export const TaxRateUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { taxRateId } = useParams();
  const {
    data: taxRate,
    isLoading,
    error,
  } = useGetTaxRateQuery({ nodeId: currentNode.id, taxRateId: Number(taxRateId) });
  const [updateTaxRate] = useUpdateTaxRateMutation();

  if (error) {
    return <Navigate to={TaxRateRoutes.list()} />;
  }

  if (isLoading || !taxRate) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("updateTaxRate")}
      successRoute={TaxRateRoutes.list()}
      initialValues={taxRate as TaxRate}
      validationSchema={TaxRateSchema}
      onSubmit={(t) => updateTaxRate({ nodeId: currentNode.id, taxRateId: taxRate.id, newTaxRate: t })}
      form={TaxRateForm}
    />
  );
};
