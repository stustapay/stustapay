import { Delete as DeleteIcon } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemText } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { NewTillButton, Product, selectProductById, useListProductsQuery } from "@/api";
import { ProductSelect } from "@/components/features";
import { useCurrentNode } from "@/hooks";

interface ProductSelectProps {
  productIds: number[];
  onChange: (productIds: number[]) => void;
}

const ProductSelection: React.FC<ProductSelectProps> = ({ productIds, onChange }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: products } = useListProductsQuery({ nodeId: currentNode.id });

  const [currentSelectedProduct, setCurrentSelectedProduct] = React.useState<Product | null>(null);

  const getProductById = (id: number) => (products != null ? selectProductById(products, id) : undefined);
  const mapped = products ? (productIds.map((id) => getProductById(id)) as Product[]) : [];

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
      {mapped.map((product) => (
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
