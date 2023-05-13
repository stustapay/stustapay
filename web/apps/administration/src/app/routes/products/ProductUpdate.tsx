import * as React from "react";
import { useTranslation } from "react-i18next";
import { selectProductById, useGetProductByIdQuery, useUpdateProductMutation } from "@api";
import { Navigate, useParams } from "react-router-dom";
import { ProductChange } from "./ProductChange";
import { ProductSchema } from "@stustapay/models";
import { Loading } from "@stustapay/components";

export const ProductUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { productId } = useParams();
  const { product, isLoading } = useGetProductByIdQuery(Number(productId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      product: data ? selectProductById(data, Number(productId)) : undefined,
    }),
  });
  const [updateProduct] = useUpdateProductMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!product) {
    return <Navigate to="/products" />;
  }

  return (
    <ProductChange
      headerTitle={t("product.update")}
      submitLabel={t("update")}
      initialValues={product}
      validationSchema={ProductSchema}
      onSubmit={updateProduct}
    />
  );
};
