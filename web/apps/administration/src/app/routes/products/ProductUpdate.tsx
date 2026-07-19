import { Loading } from "@stustapay/components";
import { ProductSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { ProductRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getProductCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { ProductForm } from "./ProductForm";

export const ProductUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { productId } = useParams();
  const {
    data: product,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ products: getProductCollection(currentNode.id) })
        .where(({ products }) => eq(products.id, Number(productId)))
        .findOne(),
    [currentNode.id, productId]
  );

  if (isError) {
    return <Navigate to={ProductRoutes.list()} />;
  }

  if (isLoading || !product) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("product.update")}
      successRoute={ProductRoutes.detail(product.id)}
      initialValues={{
        ...product,
        price_in_vouchers: product.price_in_vouchers ?? null,
      }}
      validationSchema={ProductSchema}
      onSubmit={(p) =>
        getProductCollection(currentNode.id).update(product.id, (draft) => {
          draft.name = p.name;
          draft.price = p.price;
          draft.fixed_price = p.fixed_price ?? false;
          draft.tax_rate_id = p.tax_rate_id;
          draft.user_tag_variant_ids = p.user_tag_variant_ids ?? [];
          draft.is_locked = p.is_locked ?? false;
          draft.is_returnable = p.is_returnable ?? false;
          draft.price_in_vouchers = p.price_in_vouchers ?? null;
        })
      }
      form={ProductForm}
    />
  );
});
