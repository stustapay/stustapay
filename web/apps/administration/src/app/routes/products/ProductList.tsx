import {
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  SmartButton as SmartButtonIcon,
} from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import {
  Product,
  selectProductAll,
  selectTaxRateById,
  selectUserTagVariantEntities,
  useCreateProductMutation,
  useDeleteProductMutation,
  useListProductsQuery,
  useListTaxRatesQuery,
  useListUserTagVariantsQuery,
  useUpdateProductMutation,
} from "@/api";
import { ProductRoutes, tillButtonCreateFromProduct, TillButtonsRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

export const ProductList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageProducts = useCurrentUserHasPrivilege(ProductRoutes.privilege);
  const canManageProductsAtNode = useCurrentUserHasPrivilegeAtNode(ProductRoutes.privilege);
  const canCreateTillButtonAtNode = useCurrentUserHasPrivilegeAtNode(TillButtonsRoutes.privilege);
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
  const { data: userTagVariants } = useListUserTagVariantsQuery({ nodeId: currentNode.id });
  const [createProduct] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const { dataGridNodeColumn } = useRenderNode();

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

  const handleToggleLockProduct = (product: Product) => {
    updateProduct({
      nodeId: currentNode.id,
      productId: product.id,
      newProduct: { ...product, is_locked: !product.is_locked },
    });
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

  const formatUserTagVariants = React.useCallback(
    (variantIds: number[]) =>
      variantIds
        .map((variantId) => {
          const userTagVariant = userTagVariants ? selectUserTagVariantEntities(userTagVariants)[variantId] : undefined;
          return userTagVariant?.variant_name ?? String(variantId);
        })
        .join(", "),
    [userTagVariants]
  );

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
      field: "user_tag_variant_ids",
      headerName: t("product.userTagVariants"),
      valueFormatter: (value) => formatUserTagVariants(value as number[]),
      width: 180,
    },
    dataGridNodeColumn,
  ];

  if (canManageProducts) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      minWidth: 180,
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
              ...(canCreateTillButtonAtNode(params.row.node_id)
                ? [
                    <GridActionsCellItem
                      key="create-till-button"
                      icon={
                        <Tooltip title={t("product.createTillButton")}>
                          <SmartButtonIcon />
                        </Tooltip>
                      }
                      color="primary"
                      label={t("product.createTillButton")}
                      onClick={() => {
                        const { to, state } = tillButtonCreateFromProduct(params.row);
                        navigate(to, { state });
                      }}
                    />,
                  ]
                : []),
              <GridActionsCellItem
                icon={
                  params.row.is_locked ? (
                    <Tooltip title={t("product.unlock")}>
                      <UnlockIcon />
                    </Tooltip>
                  ) : (
                    <Tooltip title={t("product.lock")}>
                      <LockIcon />
                    </Tooltip>
                  )
                }
                color="primary"
                label={t("product.lock")}
                onClick={() => handleToggleLockProduct(params.row)}
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
        loading={isProductsLoading || isTaxRatesLoading}
        rows={products ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
