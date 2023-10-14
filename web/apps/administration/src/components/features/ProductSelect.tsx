import { Product, selectProductAll, useListProductsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export type ProductSelectProps = Omit<
  SelectProps<Product, number, false>,
  "options" | "formatOption" | "multiple" | "getOptionKey"
>;

export const ProductSelect: React.FC<ProductSelectProps> = (props) => {
  const { currentNode } = useCurrentNode();
  const { products } = useListProductsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        products: data ? selectProductAll(data) : [],
      }),
    }
  );

  return (
    <Select
      multiple={false}
      options={products}
      getOptionKey={(product: Product) => product.id}
      formatOption={(product) => `${product.name} (${product.price})€`}
      {...props}
    />
  );
};
