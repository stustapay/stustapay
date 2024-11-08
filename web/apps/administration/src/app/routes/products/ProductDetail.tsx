import { useDeleteProductMutation, useGetProductQuery, useUpdateProductMutation } from "@/api";
import { ProductRoutes } from "@/app/routes";
import { DetailBoolField, DetailField, DetailLayout, DetailListField, DetailView } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const ProductDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { productId } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const [deleteProduct] = useDeleteProductMutation();
  const { data: product, error } = useGetProductQuery({ nodeId: currentNode.id, productId: Number(productId) });
  const [updateProduct] = useUpdateProductMutation();
  const openModal = useOpenModal();

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

  const handleLockProduct = () => {
    updateProduct({ nodeId: currentNode.id, productId: product.id, newProduct: { ...product, is_locked: true } });
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
        {
          label: t("product.lock"),
          disabled: product.is_locked,
          onClick: handleLockProduct,
          color: "error",
          icon: <LockIcon />,
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
        <DetailListField label={t("product.restrictions")} value={product?.restrictions} />
        <DetailField label={t("product.price")} value={formatCurrency(product.price)} />
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
