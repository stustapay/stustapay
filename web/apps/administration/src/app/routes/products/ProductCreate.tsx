import { NewProductSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { ProductRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { NewProduct } from "@/db/api/generated";
import { generateId, getProductCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { ProductForm } from "./ProductForm";

const initialValues: NewProduct = {
  name: "",
  price: 0,
  tax_rate_id: null as unknown as number,
  fixed_price: true,
  price_in_vouchers: null,
  user_tag_variant_ids: [],
  is_locked: false,
  is_returnable: false,
};

export const ProductCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("product.create")}
      successRoute={ProductRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewProductSchema}
      onSubmit={(product) =>
        // TODO: COLLECTIONS-MIGRATION: tax rate fields are weird
        getProductCollection(currentNode.id).insert({
          ...product,
          id: generateId(),
          node_id: currentNode.id,
          fixed_price: product.fixed_price ?? true,
          user_tag_variant_ids: product.user_tag_variant_ids ?? [],
          is_locked: product.is_locked ?? false,
          is_returnable: product.is_returnable ?? false,
          tax_name: "",
          tax_rate: 0,
          tax_type: "no_tax",
          type: "user_defined",
        })
      }
      form={ProductForm}
    />
  );
});
