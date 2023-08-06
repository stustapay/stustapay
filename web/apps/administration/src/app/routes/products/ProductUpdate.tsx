import { ProductRoutes } from "@/app/routes";
import { useGetProductQuery, useUpdateProductMutation } from "@api";
import { EditLayout } from "@components";
import { Loading } from "@stustapay/components";
import { ProductSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { ProductForm } from "./ProductForm";

export const ProductUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { productId } = useParams();
  const { data: product, isLoading, error } = useGetProductQuery({ productId: Number(productId) });
  const [updateProduct] = useUpdateProductMutation();

  if (error) {
    return <Navigate to={ProductRoutes.list()} />;
  }

  if (isLoading || !product) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("product.update")}
      submitLabel={t("update")}
      successRoute={ProductRoutes.detail(product.id)}
      initialValues={product}
      validationSchema={ProductSchema}
      onSubmit={(p) => updateProduct({ productId: product.id, newProduct: p })}
      form={ProductForm}
    />
  );
};
