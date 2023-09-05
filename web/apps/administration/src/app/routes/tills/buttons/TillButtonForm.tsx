import { NewTillButton, Product, selectProductById, useListProductsQuery } from "@/api";
import { ProductSelect } from "@components/features";
import { useCurrentNode } from "@hooks";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, TextField } from "@mui/material";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

interface ProductSelectProps {
  productIds: number[];
  onChange: (productIds: number[]) => void;
}

const ProductSelection: React.FC<ProductSelectProps> = ({ productIds, onChange }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: products } = useListProductsQuery({ nodeId: currentNode.id });

  const getProductById = (id: number) => (products != null ? selectProductById(products, id) : undefined);
  const mapped = products ? (productIds.map((id) => getProductById(id)) as Product[]) : [];

  const removeProduct = (productId: number) => {
    onChange(productIds.filter((pId) => pId !== productId));
  };

  const addProduct = (productId: number) => {
    onChange([...productIds, productId]);
  };

  return (
    <List>
      {mapped.map((product) => (
        <ListItem key={product.id}>
          <ListItemText primary={product.name} />
          <ListItemSecondaryAction>
            <IconButton color="error" onClick={() => removeProduct(product.id)}>
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
      <ProductSelect
        label={t("button.addProductToButton")}
        variant="standard"
        value={null}
        onChange={(pId: number) => addProduct(pId)}
      />
    </List>
  );
};

export type TillButtonFormProps<T extends NewTillButton> = FormikProps<T>;

export function TillButtonForm<T extends NewTillButton>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: TillButtonFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("button.name")}
        error={touched.name && !!errors.name}
        helperText={(touched.name && errors.name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />

      <ProductSelection
        productIds={values.product_ids}
        onChange={(productIds: number[]) => setFieldValue("product_ids", productIds)}
      />
    </>
  );
}
