import * as React from "react";
import { useCreateProductMutation } from "@api";
import { useTranslation } from "react-i18next";
import { ProductChange } from "./ProductChange";
import { NewProduct, NewProductSchema } from "@stustapay/models";

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
  const [createProduct] = useCreateProductMutation();

  return (
    <ProductChange
      headerTitle={t("product.create")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={NewProductSchema}
      onSubmit={(product) => createProduct({ newProduct: product })}
    />
  );
};
