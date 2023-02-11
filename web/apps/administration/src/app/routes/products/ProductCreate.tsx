import * as React from "react";
import { NewProduct } from "../../../models/product";
import { useCreateProductMutation } from "../../../api";
import { useTranslation } from "react-i18next";
import { ProductChange } from "./ProductChange";

const initialValues: NewProduct = {
  name: "",
  price: 0,
  tax: "none",
};

export const ProductCreate: React.FC = () => {
  const { t } = useTranslation(["products", "common"]);
  const [createProduct] = useCreateProductMutation();

  return (
    <ProductChange
      headerTitle={t("createProduct")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      onSubmit={createProduct}
    />
  );
};
