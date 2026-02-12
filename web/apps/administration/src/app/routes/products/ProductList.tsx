import {
  Product,
  selectProductAll,
  selectTaxRateById,
  useCreateProductMutation,
  useDeleteProductMutation,
  useListProductsQuery,
  useListTaxRatesQuery,
  useUpdateProductMutation,
} from "@/api";
import { ProductRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import {
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { useOpenModal } from "@stustapay/modal-provider";

export const ProductList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageProducts = useCurrentUserHasPrivilege(ProductRoutes.privilege);
  const canManageProductsAtNode = useCurrentUserHasPrivilegeAtNode(ProductRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

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
  const { dataGridNodeColumn } = useRenderNode();

  if (isProductsLoading || isTaxRatesLoading) {
    return <Loading />;
  }

  const renderTaxRate = (id: number) => {
    if (!taxRates) {
      return "";
    }

    const tax = selectTaxRateById(taxRates, id);
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
    openModal({
      type: "confirm",
      title: t("product.delete"),
      content: t("product.deleteDescription"),
      onConfirm: () => {
        deleteProduct({ nodeId: currentNode.id, productId })
          .unwrap()
          .catch(() => undefined);
        return true;
      },
    });
  };

  const copyProduct = (product: Product) => {
    createProduct({ nodeId: currentNode.id, newProduct: { ...product, name: `${product.name} - ${t("copy")}` } });
  };

  const columns: GridColDef<Product>[] = [
    {
      field: "name",
      headerName: t("product.name"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={ProductRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "is_locked",
      headerName: t("product.isLocked"),
      type: "boolean",
    },
    {
      field: "is_returnable",
      headerName: t("product.isReturnable"),
      type: "boolean",
    },
    {
      field: "fixed_price",
      headerName: t("product.isFixedPrice"),
      type: "boolean",
    },
    {
      field: "price",
      headerName: t("product.price"),
      type: "currency",
    },
    {
      field: "price_in_vouchers",
      headerName: t("product.priceInVouchers"),
      type: "number",
    },
    {
      field: "tax_rate_id",
      headerName: t("product.taxRate"),
      align: "right",
      renderCell: (params) => renderTaxRate(params.row.tax_rate_id),
    },
    {
      field: "restrictions",
      headerName: t("product.restrictions"),
      valueFormatter: (value) => (value as string[]).join(", "),
      width: 150,
    },
    dataGridNodeColumn,
  ];

  if (canManageProducts) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageProductsAtNode(params.row.node_id)
          ? [
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
                icon={<DeleteIcon color="error" />}
                disabled={params.row.is_locked}
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("products")} routes={ProductRoutes}>
      <DataGrid
        autoHeight
        rows={products ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
