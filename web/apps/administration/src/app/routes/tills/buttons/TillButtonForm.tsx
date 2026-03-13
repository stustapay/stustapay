import { NewTillButton, Product, selectProductById, useListProductsQuery } from "@/api";
import { ProductSelect } from "@/components/features";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type ProductSelectProps = {
  productIds: number[];
  onChange: (productIds: number[]) => void;
};

const ProductSelection: React.FC<ProductSelectProps> = ({ productIds, onChange }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: products } = useListProductsQuery({ nodeId: currentNode.id });

  const allProducts = React.useMemo(() => {
    if (!products) return [];
    return Object.values(products.entities)
      .filter(Boolean)
      .filter(product => product.node_id === currentNode.id);
  }, [products, currentNode.id]);

  const getProductById = (id: number) => (allProducts ? allProducts.find(p => p.id === id) : undefined);
  const mapped = productIds.map(id => getProductById(id)).filter(Boolean) as Product[];

  const removeProduct = (productId: number) => {
    onChange(productIds.filter((pId) => pId !== productId));
  };

  const addProduct = (product: Product | null) => {
    if (product != null) {
      onChange([...productIds, product.id]);
    }
  };

  return (
    <List>
      {mapped.map((product) => (
        <ListItem key={product.id}>
          <ListItemText primary={product.name} />
          <ListItemSecondaryAction>
            <IconButton color="primary" onClick={() => removeProduct(product.id)}>
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
      <ProductSelect
        label={t("button.addProductToButton")}
        variant="standard"
        value={null}
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
