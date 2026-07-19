import { Select, SelectProps } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";

import { Product } from "@/api";
import { getProductCollection } from "@/db/collections";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";

export type ProductSelectProps = Omit<SelectProps<Product, false>, "options" | "formatOption" | "multiple">;

export const ProductSelect: React.FC<ProductSelectProps> = ({ ...props }) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { data: products } = useLiveQuery(
    (q) => q.from({ products: getProductCollection(currentNode.id) }),
    [currentNode.id]
  );

  return (
    <Select
      multiple={false}
      options={products}
      formatOption={(product) => `${product.name} (${formatCurrency(product.price)})`}
      {...props}
    />
  );
};
