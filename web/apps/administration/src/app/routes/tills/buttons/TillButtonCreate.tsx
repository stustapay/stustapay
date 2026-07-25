import { NewTillButton, NewTillButtonSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TillButtonCreateFromProductState, TillButtonsRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getTillButtonCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillButtonForm } from "./TillButtonForm";

const defaultInitialValues: NewTillButton = {
  name: "",
  product_ids: [],
};

export const TillButtonCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const location = useLocation();

  const fromProduct = (location.state as TillButtonCreateFromProductState | null)?.productId
    ? (location.state as TillButtonCreateFromProductState)
    : null;

  const initialValues = React.useMemo(
    (): NewTillButton =>
      fromProduct
        ? {
            name: fromProduct.productName,
            product_ids: [fromProduct.productId],
          }
        : defaultInitialValues,
    [fromProduct]
  );

  return (
    <CreateLayoutV2
      key={fromProduct?.productId ?? "new"}
      title={t("button.create")}
      successRoute={TillButtonsRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillButtonSchema}
      onSubmit={(button) =>
        getTillButtonCollection(currentNode.id).insert({
          ...button,
          id: generateId(),
          node_id: currentNode.id,
          price: 0,
        })
      }
      form={TillButtonForm}
    />
  );
});
