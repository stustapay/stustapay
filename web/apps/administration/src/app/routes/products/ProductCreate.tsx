import { NewProduct, NewProductSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateProductMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { ProductRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { ProductForm } from "./ProductForm";

const initialValues: NewProduct = {
  name: "",
  price: 0,
  tax_rate_id: null as unknown as number,
  fixed_price: true,
  price_in_vouchers: null,
  restrictions: [],
  is_locked: false,
  is_returnable: false,
};

export const ProductCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createProduct] = useCreateProductMutation();

  return (
    <CreateLayout
      title={t("product.create")}
      successRoute={ProductRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewProductSchema}
      onSubmit={(product) => createProduct({ nodeId: currentNode.id, newProduct: product })}
      form={ProductForm}
    />
  );
});
