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
import { ArrayElement } from "@stustapay/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { ProductRoutes, tillButtonCreateFromProduct, TillButtonsRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import {
  getProductCollection,
  getTaxRateCollection,
  getUserTagVariantCollection,
} from "@/db/collections";
import {
  useCurrentNode,
  useCurrentUserHasPrivilege,
  useCurrentUserHasPrivilegeAtNode,
  useRenderNode,
} from "@/hooks";

export const ProductList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageProducts = useCurrentUserHasPrivilege(ProductRoutes.privilege);
  const canManageProductsAtNode = useCurrentUserHasPrivilegeAtNode(ProductRoutes.privilege);
  const canCreateTillButtonAtNode = useCurrentUserHasPrivilegeAtNode(TillButtonsRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: products, isLoading: isProductsLoading } = useLiveQuery(
    (q) =>
      q
        .from({ products: getProductCollection(currentNode.id) })
        .join(
          { taxRates: getTaxRateCollection(currentNode.id) },
          ({ taxRates, products }) => eq(products.tax_rate_id, taxRates.id),
          "inner" as const,
        )
        .select(({ products, taxRates }) => ({
          ...products,
          taxRate: taxRates,
        })),
    [currentNode.id],
  );
  const { data: userTagVariants, isLoading: isUserTagVariantsLoading } = useLiveQuery(
    (q) => q.from({ userTagVariants: getUserTagVariantCollection(currentNode.id) }),
    [currentNode.id],
  );
  const userTagVariantById = React.useMemo(
    () => new Map((userTagVariants ?? []).map((variant) => [variant.id, variant])),
    [userTagVariants],
  );
  const isLoading = isProductsLoading || isUserTagVariantsLoading;
  const { dataGridNodeColumn } = useRenderNode();

  const handleToggleLockProduct = (product: ArrayElement<NonNullable<typeof products>>) => {
    getProductCollection(currentNode.id).update(product.id, (draft) => {
      draft.is_locked = !draft.is_locked;
    });
  };

  const openConfirmDeleteDialog = (productId: number) => {
    openModal({
      type: "confirm",
      title: t("product.delete"),
      content: t("product.deleteDescription"),
      onConfirm: () => {
        getProductCollection(currentNode.id).delete(productId);
        return true;
      },
    });
  };

  const copyProduct = (product: ArrayElement<NonNullable<typeof products>>) => {
    getProductCollection(currentNode.id).insert({
      ...product,
      id: 0,
      node_id: currentNode.id,
      name: `${product.name} - ${t("copy")}`,
    });
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof products>>>[] = [
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
      renderCell: ({ row }) => (
        <Tooltip title={row.taxRate.description}>
          <span>{(row.taxRate.rate * 100).toFixed(0)} %</span>
        </Tooltip>
      ),
    },
    {
      field: "userTagVariants",
      headerName: t("product.userTagVariants"),
      valueGetter: (_, row) =>
        row.user_tag_variant_ids
          .map((variantId) => userTagVariantById.get(variantId)?.variant_name ?? String(variantId))
          .join(", "),
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
        loading={isLoading}
        rows={products ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
