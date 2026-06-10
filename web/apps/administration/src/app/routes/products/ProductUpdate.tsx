import { Loading } from "@stustapay/components";
import { ProductSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { useGetProductQuery, useUpdateProductMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { ProductRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { ProductForm } from "./ProductForm";

export const ProductUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { productId } = useParams();
  const {
    data: product,
    isLoading,
    error,
  } = useGetProductQuery({ nodeId: currentNode.id, productId: Number(productId) });
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
      successRoute={ProductRoutes.detail(product.id)}
      initialValues={{
        ...product,
        price_in_vouchers: product.price_in_vouchers || null,
      }}
      validationSchema={ProductSchema}
      onSubmit={(p) => updateProduct({ nodeId: currentNode.id, productId: product.id, newProduct: p })}
      form={ProductForm}
    />
  );
});
