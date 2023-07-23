import {
  Button,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { NewTillButton, Product, selectProductById, useListProductsQuery } from "@api";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { ProductSelect } from "@components";

interface ProductSelectProps {
  productIds: number[];
  onChange: (productIds: number[]) => void;
}

const ProductSelection: React.FC<ProductSelectProps> = ({ productIds, onChange }) => {
  const { t } = useTranslation();
  const { data: products } = useListProductsQuery();

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

export interface TillButtonChangeProps<T extends NewTillButton> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TillButtonChange<T extends NewTillButton>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TillButtonChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/till-buttons");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in till button update", err);
      });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">{headerTitle}</Typography>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(validationSchema)}
      >
        {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => (
          <Form onSubmit={handleSubmit}>
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

            {isSubmitting && <LinearProgress />}
            <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 1 }}>
              {submitLabel}
            </Button>
          </Form>
        )}
      </Formik>
    </Paper>
  );
}
