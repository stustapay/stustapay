import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  SmartButton as SmartButtonIcon,
} from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
  selectUserTagVariantEntities,
  useDeleteProductMutation,
  useGetProductQuery,
  useListUserTagVariantsQuery,
  useUpdateProductMutation,
} from "@/api";
import { ProductRoutes, tillButtonCreateFromProduct, TillButtonsRoutes } from "@/app/routes";
import {
  DetailBoolField,
  DetailField,
  DetailLayout,
  DetailListField,
  DetailNumberField,
  DetailView,
} from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilegeAtNode } from "@/hooks";

export const ProductDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { productId } = useParams();
  const navigate = useNavigate();
  const [deleteProduct] = useDeleteProductMutation();
  const { data: product, error } = useGetProductQuery({ nodeId: currentNode.id, productId: Number(productId) });
  const { data: userTagVariants } = useListUserTagVariantsQuery({ nodeId: currentNode.id });
  const [updateProduct] = useUpdateProductMutation();
  const openModal = useOpenModal();
  const canCreateTillButtonAtNode = useCurrentUserHasPrivilegeAtNode(TillButtonsRoutes.privilege);

  if (error) {
    return <Navigate to={ProductRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("product.delete"),
      content: t("product.deleteDescription"),
      onConfirm: () => {
        deleteProduct({ nodeId: currentNode.id, productId: Number(productId) }).then(() =>
          navigate(ProductRoutes.list())
        );
        return true;
      },
    });
  };

  if (product === undefined) {
    return <Loading />;
  }

  const handleToggleLockProduct = () => {
    updateProduct({
      nodeId: currentNode.id,
      productId: product.id,
      newProduct: { ...product, is_locked: !product.is_locked },
    });
  };

  return (
    <DetailLayout
      title={product.name}
      routes={ProductRoutes}
      elementNodeId={product.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(ProductRoutes.edit(productId)),
          color: "primary",
          icon: <EditIcon />,
        },
        ...(canCreateTillButtonAtNode(product.node_id)
          ? [
              {
                label: t("product.createTillButton"),
                onClick: () => {
                  const { to, state } = tillButtonCreateFromProduct(product);
                  navigate(to, { state });
                },
                color: "primary" as const,
                icon: <SmartButtonIcon />,
              },
            ]
          : []),
        {
          label: product.is_locked ? t("product.unlock") : t("product.lock"),
          onClick: handleToggleLockProduct,
          color: "error",
          icon: product.is_locked ? <UnlockIcon /> : <LockIcon />,
        },
        {
          label: t("delete"),
          disabled: product.is_locked,
          onClick: openConfirmDeleteDialog,
          color: "error",
          icon: <DeleteIcon />,
        },
      ]}
    >
      <DetailView>
        <DetailField label={t("product.name")} value={product.name} />
        <DetailBoolField label={t("product.isLocked")} value={product.is_locked} />
        <DetailBoolField label={t("product.isReturnable")} value={product.is_returnable} />
        <DetailBoolField label={t("product.isFixedPrice")} value={product.fixed_price} />
        <DetailListField
          label={t("product.userTagVariants")}
          value={product.user_tag_variant_ids.map((variantId) => {
            const userTagVariant = userTagVariants
              ? selectUserTagVariantEntities(userTagVariants)[variantId]
              : undefined;
            return userTagVariant?.variant_name ?? String(variantId);
          })}
        />
        <DetailNumberField label={t("product.price")} type="currency" value={product.price} />
        <DetailField label={t("product.priceInVouchers")} value={product.price_in_vouchers} />
        <DetailField
          label={t("product.taxRate")}
          value={
            <span>
              {product.tax_name} ({(product.tax_rate * 100).toFixed(0)}%)
            </span>
          }
        />
      </DetailView>
    </DetailLayout>
  );
};
