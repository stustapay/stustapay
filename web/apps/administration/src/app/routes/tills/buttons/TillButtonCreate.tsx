import { NewTillButton, NewTillButtonSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { useCreateTillButtonMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { TillButtonCreateFromProductState, TillButtonsRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
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
  const [createTillButton] = useCreateTillButtonMutation();

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
    <CreateLayout
      key={fromProduct?.productId ?? "new"}
      title={t("button.create")}
      successRoute={TillButtonsRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillButtonSchema}
      onSubmit={(button) => createTillButton({ nodeId: currentNode.id, newTillButton: button })}
      form={TillButtonForm}
    />
  );
});
