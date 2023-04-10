import * as React from "react";
import { NewProduct, NewProductSchema } from "../../../models/product";
import { useCreateProductMutation } from "../../../api";
import { useTranslation } from "react-i18next";
import { ProductChange } from "./ProductChange";

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
  const { t } = useTranslation(["products", "common"]);
  const [createProduct] = useCreateProductMutation();

  return (
    <ProductChange
      headerTitle={t("createProduct")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewProductSchema}
      onSubmit={createProduct}
    />
  );
};
