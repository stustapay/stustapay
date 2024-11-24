import { Product, selectProductAll, useListProductsQuery } from "@/api";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export type ProductSelectProps = {
  onlyLocked?: boolean;
} & Omit<SelectProps<Product, false>, "options" | "formatOption" | "multiple">;

export const ProductSelect: React.FC<ProductSelectProps> = ({ onlyLocked = false, ...props }) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { products } = useListProductsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        products: data ? selectProductAll(data).filter((p) => p.is_locked || !onlyLocked) : [],
      }),
    }
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
