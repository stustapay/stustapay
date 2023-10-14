import { useGetTaxRateQuery, useUpdateTaxRateMutation } from "@/api";
import { TaxRateRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { TaxRate, TaxRateSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TaxRateForm } from "./TaxRateForm";

export const TaxRateUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { taxRateName } = useParams();
  const {
    data: taxRate,
    isLoading,
    error,
  } = useGetTaxRateQuery({ nodeId: currentNode.id, taxRateName: taxRateName as string });
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
      submitLabel={t("update")}
      successRoute={TaxRateRoutes.detail(taxRate.name)}
      initialValues={taxRate as TaxRate}
      validationSchema={TaxRateSchema}
      onSubmit={(taxRate: TaxRate) =>
        updateTaxRate({ nodeId: currentNode.id, taxRateName: taxRate.name, taxRateWithoutName: taxRate })
      }
      form={TaxRateForm}
    />
  );
};
