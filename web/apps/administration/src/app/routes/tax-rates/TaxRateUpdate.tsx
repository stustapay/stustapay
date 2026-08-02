import { Loading } from "@stustapay/components";
import { TaxRateSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { TaxRate } from "@/api";
import { TaxRateRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getTaxRateCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TaxRateForm } from "./TaxRateForm";

export const TaxRateUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { taxRateId } = useParams();
  const {
    data: taxRate,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ taxRates: getTaxRateCollection(currentNode.id) })
        .where(({ taxRates }) => eq(taxRates.id, Number(taxRateId)))
        .findOne(),
    [currentNode.id, taxRateId]
  );

  if (isError) {
    return <Navigate to={TaxRateRoutes.list()} />;
  }

  if (isLoading || !taxRate) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("updateTaxRate")}
      successRoute={TaxRateRoutes.list()}
      initialValues={taxRate as TaxRate}
      validationSchema={TaxRateSchema}
      onSubmit={(t) =>
        getTaxRateCollection(currentNode.id).update(taxRate.id, (draft) => {
          draft.name = t.name;
          draft.rate = t.rate;
          draft.description = t.description;
          draft.tax_type = t.tax_type;
        })
      }
      form={TaxRateForm}
    />
  );
};
