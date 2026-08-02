import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  SmartButton as SmartButtonIcon,
} from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { ProductRoutes, tillButtonCreateFromProduct, TillButtonsRoutes } from "@/app/routes";
import {
  DetailBoolField,
  DetailField,
  DetailLayout,
  DetailListField,
  DetailNumberField,
  DetailView,
} from "@/components";
import { getProductCollection, getUserTagVariantCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilegeAtNode } from "@/hooks";

export const ProductDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { productId } = useParams();
  const navigate = useNavigate();

  const {
    data: product,
    isLoading: isProductLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ products: getProductCollection(currentNode.id) })
        .where(({ products }) => eq(products.id, Number(productId)))
        .findOne(),
    [currentNode.id, productId]
  );
  const { data: userTagVariants, isLoading: isUserTagVariantsLoading } = useLiveQuery(
    (q) =>
      q
        .from({ userTagVariants: getUserTagVariantCollection(currentNode.id) })
        .where(({ userTagVariants }) => inArray(userTagVariants.id, product?.user_tag_variant_ids ?? [])),
    [currentNode.id, product?.user_tag_variant_ids]
  );
  const openModal = useOpenModal();
  const canCreateTillButtonAtNode = useCurrentUserHasPrivilegeAtNode(TillButtonsRoutes.privilege);

  if (isError) {
    return <Navigate to={ProductRoutes.list()} />;
  }

  if (isProductLoading || isUserTagVariantsLoading || !product) {
    return <Loading />;
  }
  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("product.delete"),
      content: t("product.deleteDescription"),
      onConfirm: () => {
        getProductCollection(currentNode.id).delete(product.id);
        return true;
      },
    });
  };

  const handleToggleLockProduct = () => {
    getProductCollection(currentNode.id).update(product.id, (draft) => {
      draft.is_locked = !draft.is_locked;
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
          value={userTagVariants.map((variant) => variant.variant_name)}
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
