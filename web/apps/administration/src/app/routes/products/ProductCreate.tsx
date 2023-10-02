import { ProductRoutes } from "@/app/routes";
import { useCreateProductMutation } from "@api";
import { CreateLayout } from "@components";
import { useCurrentNode } from "@hooks";
import { NewProduct, NewProductSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ProductForm } from "./ProductForm";

const initialValues: NewProduct = {
  name: "",
  price: 0,
  tax_name: "none",
  fixed_price: true,
  price_in_vouchers: 0,
  restrictions: [],
  is_locked: false,
  is_returnable: false,
};

export const ProductCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createProduct] = useCreateProductMutation();

  return (
    <CreateLayout
      title={t("product.create")}
      submitLabel={t("add")}
      successRoute={ProductRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewProductSchema}
      onSubmit={(product) => createProduct({ nodeId: currentNode.id, newProduct: product })}
      form={ProductForm}
    />
  );
};
