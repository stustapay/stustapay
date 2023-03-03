import {
  Paper,
  TextField,
  Button,
  LinearProgress,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { NewTerminalButton, Product } from "@models";
import { useGetProductsQuery } from "@api";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { ProductSelect } from "./ProductSelect";

interface ProductSelectProps {
  productIds: number[];
  onChange: (productIds: number[]) => void;
}

const ProductSelection: React.FC<ProductSelectProps> = ({ productIds, onChange }) => {
  const { t } = useTranslation(["terminals", "common"]);
  const { data: products } = useGetProductsQuery();

  const getProductById = (id: number) => (products ?? []).find((p) => p.id === id);
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
        label={t("addProductToButton")}
        variant="standard"
        value={null}
        onChange={(pId: number) => addProduct(pId)}
      />
    </List>
  );
};

export interface TerminalButtonChangeProps<T extends NewTerminalButton> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TerminalButtonChange<T extends NewTerminalButton>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TerminalButtonChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation(["terminals", "common"]);
  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/terminal-buttons");
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in terminal button update", err);
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
              label={t("terminalButtonName")}
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
