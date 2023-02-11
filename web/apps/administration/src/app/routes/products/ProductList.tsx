import * as React from "react";
import {
  Paper,
  Button,
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
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useGetProductsQuery, useGetTaxRatesQuery } from "../../../api";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconButtonLink } from "../../../components/IconButtonLink";

export const ProductList: React.FC = () => {
  const { t } = useTranslation(["products", "common"]);
  const navigate = useNavigate();

  const { data: products, isLoading: isProductsLoading } = useGetProductsQuery();
  const { data: taxRates, isLoading: isTaxRatesLoading } = useGetTaxRatesQuery();

  if (isProductsLoading || isTaxRatesLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const addProduct = () => {
    navigate("/products/new");
  };

  const deleteProduct = (productId: number) => {};

  const renderTaxRate = (name: string) => {
    const tax = (taxRates ?? []).find((rate) => rate.name === name);
    if (!tax) {
      return "";
    }

    return (
      <Tooltip title={tax.description}>
        <span>{tax.rate * 100} %</span>
      </Tooltip>
    );
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <Button onClick={addProduct} endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </Button>
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
                  <IconButton color="error" onClick={() => deleteProduct(product.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
