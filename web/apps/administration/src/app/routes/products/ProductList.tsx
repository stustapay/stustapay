import * as React from "react";
import { Paper, ListItem, ListItemText, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import {
  selectProductAll,
  selectTaxRateById,
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductsQuery,
  useGetTaxRatesQuery,
  useLockProductMutation,
} from "@api";
import { useTranslation } from "react-i18next";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { Product } from "@stustapay/models";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Loading } from "@stustapay/components";
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
  const [lockProduct] = useLockProductMutation();

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

  const columns: GridColDef<Product>[] = [
    {
      field: "name",
      headerName: t("product.name") as string,
      flex: 1,
      renderCell: (params) => <RouterLink to={`/products/${params.row.id}`}>{params.row.name}</RouterLink>,
    },
    {
      field: "is_locked",
      headerName: t("product.isLocked") as string,
      type: "boolean",
    },
    {
      field: "is_returnable",
      headerName: t("product.isReturnable") as string,
      type: "boolean",
    },
    {
      field: "fixed_price",
      headerName: t("product.isFixedPrice") as string,
      type: "boolean",
    },
    {
      field: "price",
      headerName: t("product.productPrice") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "price_in_vouchers",
      headerName: t("product.productPriceInVouchers") as string,
      type: "number",
    },
    {
      field: "tax_rate",
      headerName: t("product.taxRate") as string,
      align: "right",
      renderCell: (params) => renderTaxRate(params.row.tax_name),
    },
    {
      field: "restrictions",
      headerName: t("product.restrictions") as string,
      valueFormatter: ({ value }) => value.join(", "),
      width: 150,
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
          icon={<LockIcon />}
          color="primary"
          disabled={params.row.is_locked}
          label={t("lockProduct")}
          onClick={() => lockProduct(params.row)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          disabled={params.row.is_locked}
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
        disableRowSelectionOnClick
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
