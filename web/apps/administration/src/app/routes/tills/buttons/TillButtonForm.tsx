import { Delete as DeleteIcon } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemText } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { NewTillButton, Product } from "@/api";
import { ProductSelect } from "@/components/features";
import { getProductCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

interface ProductSelectProps {
  productIds: number[];
  onChange: (productIds: number[]) => void;
}

const ProductListItem: React.FC<{
  productId: number;
  removeProduct: (productId: number) => void;
}> = ({ productId, removeProduct }) => {
  const { currentNode } = useCurrentNode();
  const { data: product } = useLiveQuery(
    (q) =>
      q
        .from({ products: getProductCollection(currentNode.id) })
        .where(({ products }) => eq(products.id, productId))
        .findOne(),
    [currentNode.id]
  );

  if (!product) {
    return null;
  }
  return (
    <ListItem
      key={product.id}
      secondaryAction={
        <IconButton color="error" onClick={() => removeProduct(product.id)}>
          <DeleteIcon />
        </IconButton>
      }
    >
      <ListItemText primary={product.name} />
    </ListItem>
  );
};

const ProductSelection: React.FC<ProductSelectProps> = ({ productIds, onChange }) => {
  const { t } = useTranslation();

  const [currentSelectedProduct, setCurrentSelectedProduct] = React.useState<Product | null>(null);

  const removeProduct = (productId: number) => {
    onChange(productIds.filter((pId) => pId !== productId));
  };

  const addProduct = (product: Product | null) => {
    if (product != null) {
      onChange([...productIds, product.id]);
      setCurrentSelectedProduct(product);
      setTimeout(() => setCurrentSelectedProduct(null));
    }
  };

  return (
    <List>
      {productIds.map((productId) => (
        <ProductListItem key={productId} productId={productId} removeProduct={removeProduct} />
      ))}
      <ProductSelect
        label={t("button.addProductToButton")}
        variant="standard"
        value={currentSelectedProduct}
        onChange={addProduct}
      />
    </List>
  );
};

export type TillButtonFormProps<T extends NewTillButton> = FormikProps<T>;

export function TillButtonForm<T extends NewTillButton>(props: TillButtonFormProps<T>) {
  const { values, setFieldValue } = props;
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="name" label={t("button.name")} formik={props} />
      <ProductSelection
        productIds={values.product_ids}
        onChange={(productIds: number[]) => setFieldValue("product_ids", productIds)}
      />
    </>
  );
}
