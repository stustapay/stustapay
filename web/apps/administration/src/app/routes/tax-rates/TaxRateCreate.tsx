import { TaxRate, TaxRateSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { TaxRateRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getTaxRateCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TaxRateForm } from "./TaxRateForm";

const initialValues: TaxRate = {
  name: "",
  rate: 0,
  description: "",
  tax_type: "no_tax",
};

export const TaxRateCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("createTaxRate")}
      successRoute={TaxRateRoutes.list()}
      initialValues={initialValues}
      validationSchema={TaxRateSchema}
      onSubmit={(t) =>
        getTaxRateCollection(currentNode.id).insert({
          ...t,
          id: generateId(),
          node_id: currentNode.id,
        })
      }
      form={TaxRateForm}
    />
  );
};
