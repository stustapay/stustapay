import * as React from "react";
import { Paper, ListItem, ListItemText, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColumns } from "@mui/x-data-grid";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import {
  selectProductAll,
  selectTaxRateById,
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductsQuery,
  useGetTaxRatesQuery,
} from "@api";
import { useTranslation } from "react-i18next";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { Product } from "@models";
import { useNavigate } from "react-router-dom";
import { Loading } from "@components/Loading";
import { useCurrencyFormatter } from "src/hooks";

export const ProductList: React.FC = () => {
  const { t } = useTranslation(["products", "common"]);
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { products, isLoading: isProductsLoading } = useGetProductsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      products: data ? selectProductAll(data) : undefined,
    }),
  });
  const { data: taxRates, isLoading: isTaxRatesLoading } = useGetTaxRatesQuery();
  const [createProduct] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [productToDelete, setProductToDelete] = React.useState<number | null>(null);
  if (isProductsLoading || isTaxRatesLoading) {
    return <Loading />;
  }

  const renderTaxRate = (name: string) => {
    if (!taxRates) {
      return "";
    }

    const tax = selectTaxRateById(taxRates, name);
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

  const columns: GridColumns<Product> = [
    {
      field: "name",
      headerName: t("productName") as string,
      flex: 1,
    },
    {
      field: "fixed_price",
      headerName: t("isFixedPrice") as string,
      type: "boolean",
    },
    {
      field: "price",
      headerName: t("productPrice") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "tax_rate",
      headerName: t("taxRate") as string,
      align: "right",
      renderCell: (params) => renderTaxRate(params.row.tax_name),
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions", { ns: "common" }) as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit", { ns: "common" })}
          onClick={() => navigate(`/products/${params.row.id}/edit`)}
        />,
        <GridActionsCellItem
          icon={<ContentCopyIcon />}
          color="primary"
          label={t("copy", { ns: "common" })}
          onClick={() => copyProduct(params.row)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete", { ns: "common" })}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

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
      </Paper>
      <DataGrid
        autoHeight
        rows={products ?? []}
        columns={columns}
        disableSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("deleteProduct")}
        body={t("deleteProductDescription")}
        show={productToDelete !== null}
        onClose={handleConfirmDeleteProduct}
      />
    </>
  );
};
