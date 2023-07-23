import * as React from "react";
import { useTranslation } from "react-i18next";
import { useGetProductQuery, useUpdateProductMutation } from "@api";
import { Navigate, useParams } from "react-router-dom";
import { ProductChange } from "./ProductChange";
import { ProductSchema } from "@stustapay/models";
import { Loading } from "@stustapay/components";

export const ProductUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { productId } = useParams();
  const { data: product, isLoading, error } = useGetProductQuery({ productId: Number(productId) });
  const [updateProduct] = useUpdateProductMutation();

  if (error) {
    return <Navigate to="/products" />;
  }

  if (isLoading || !product) {
    return <Loading />;
  }

  return (
    <ProductChange
      headerTitle={t("product.update")}
      submitLabel={t("update")}
      initialValues={product}
      validationSchema={ProductSchema}
      onSubmit={(p) => updateProduct({ productId: p.id, newProduct: p })}
    />
  );
};
