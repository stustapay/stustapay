import { ProductRoutes } from "@/app/routes";
import {
  selectProductAll,
  selectTaxRateById,
  useCreateProductMutation,
  useDeleteProductMutation,
  useListProductsQuery,
  useListTaxRatesQuery,
  useUpdateProductMutation,
} from "@api";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@components";
import {
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { Product } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useCurrencyFormatter, useCurrentNode } from "src/hooks";

export const ProductList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { products, isLoading: isProductsLoading } = useListProductsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        products: data ? selectProductAll(data) : undefined,
      }),
    }
  );
  const { data: taxRates, isLoading: isTaxRatesLoading } = useListTaxRatesQuery({ nodeId: currentNode.id });
  const [createProduct] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();

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
  const handleLockProduct = (product: Product) => {
    updateProduct({ nodeId: currentNode.id, productId: product.id, newProduct: { ...product, is_locked: true } });
  };

  const openConfirmDeleteDialog = (productId: number) => {
    setProductToDelete(productId);
  };

  const handleConfirmDeleteProduct: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && productToDelete !== null) {
      deleteProduct({ nodeId: currentNode.id, productId: productToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setProductToDelete(null);
  };

  const copyProduct = (product: Product) => {
    createProduct({ nodeId: currentNode.id, newProduct: { ...product, name: `${product.name} - ${t("copy")}` } });
  };

  const columns: GridColDef<Product>[] = [
    {
      field: "name",
      headerName: t("product.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={ProductRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
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
      headerName: t("product.price") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "price_in_vouchers",
      headerName: t("product.priceInVouchers") as string,
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
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(ProductRoutes.edit(params.row.id))}
        />,
        <GridActionsCellItem
          icon={<ContentCopyIcon />}
          color="primary"
          label={t("copy")}
          onClick={() => copyProduct(params.row)}
        />,
        <GridActionsCellItem
          icon={<LockIcon />}
          color="primary"
          disabled={params.row.is_locked}
          label={t("product.lock")}
          onClick={() => handleLockProduct(params.row)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          disabled={params.row.is_locked}
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <ListLayout title={t("products")} routes={ProductRoutes}>
      <DataGrid
        autoHeight
        rows={products ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("product.delete")}
        body={t("product.deleteDescription")}
        show={productToDelete !== null}
        onClose={handleConfirmDeleteProduct}
      />
    </ListLayout>
  );
};
