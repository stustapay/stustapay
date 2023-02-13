import * as React from "react";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  IconButton,
  Typography,
  ListItem,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductsQuery,
  useGetTaxRatesQuery,
} from "../../../api";
import { useTranslation } from "react-i18next";
import { IconButtonLink, ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "../../../components";
import { Product } from "@models";

export const ProductList: React.FC = () => {
  const { t } = useTranslation(["products", "common"]);

  const { data: products, isLoading: isProductsLoading } = useGetProductsQuery();
  const { data: taxRates, isLoading: isTaxRatesLoading } = useGetTaxRatesQuery();
  const [createProduct] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [productToDelete, setProductToDelete] = React.useState<number | null>(null);
  if (isProductsLoading || isTaxRatesLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const renderTaxRate = (name: string) => {
    const tax = (taxRates ?? []).find((rate) => rate.name === name);
    if (!tax) {
      return "";
    }

    return (
      <Tooltip title={tax.description}>
        <span>{(tax.rate * 100).toFixed(0)} %</span>
      </Tooltip>
    );
  };

  const openConfirmDeleteDialog = (productId: number) => {
    setProductToDelete(productId);
  };

  const handleConfirmDeleteProduct: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && productToDelete !== null) {
      deleteProduct(productToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setProductToDelete(null);
  };

  const copyProduct = (product: Product) => {
    createProduct({ ...product, name: `${product.name} - ${t("copy", { ns: "common" })}` });
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/products/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("products", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="products">
          <TableHead>
            <TableRow>
              <TableCell>{t("productName")}</TableCell>
              <TableCell align="right">{t("productPrice")}</TableCell>
              <TableCell align="right">{t("taxRate")}</TableCell>
              <TableCell align="right">{t("actions", { ns: "common" })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(products ?? []).map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell align="right">{product.price}</TableCell>
                <TableCell align="right">{renderTaxRate(product.tax)}</TableCell>
                <TableCell align="right">
                  <IconButtonLink to={`/products/${product.id}/edit`} color="primary">
                    <EditIcon />
                  </IconButtonLink>
                  <IconButton color="primary" onClick={() => copyProduct(product)}>
                    <ContentCopyIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => openConfirmDeleteDialog(product.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        title={t("deleteProduct")}
        body={t("deleteProductDescription")}
        show={productToDelete !== null}
        onClose={handleConfirmDeleteProduct}
      />
    </>
  );
};
