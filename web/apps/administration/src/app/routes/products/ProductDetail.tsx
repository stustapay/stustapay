import { useDeleteProductMutation, useGetProductQuery, useUpdateProductMutation } from "@/api";
import { ProductRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, DetailLayout } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon } from "@mui/icons-material";
import { Checkbox, Chip, List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
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
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to={ProductRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteProduct: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteProduct({ nodeId: currentNode.id, productId: Number(productId) }).then(() =>
        navigate(ProductRoutes.list())
      );
    }
    setShowConfirmDelete(false);
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
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("product.name")} secondary={product.name} />
          </ListItem>
          <ListItem>
            <Checkbox edge="end" checked={product.is_locked} disabled={true} sx={{ mr: 1 }} />
            <ListItemText primary={t("product.isLocked")} />
          </ListItem>
          <ListItem>
            <Checkbox edge="end" checked={product.is_returnable} disabled={true} sx={{ mr: 1 }} />
            <ListItemText primary={t("product.isReturnable")} />
          </ListItem>
          <ListItem>
            <Checkbox edge="end" checked={product.fixed_price} disabled={true} sx={{ mr: 1 }} />
            <ListItemText primary={t("product.isFixedPrice")} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("product.restrictions")}
              secondary={product?.restrictions.map((restriction) => (
                <Chip key={restriction} variant="outlined" label={restriction} sx={{ mr: 1 }} />
              ))}
            />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("product.price")} secondary={formatCurrency(product.price)} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("product.priceInVouchers")} secondary={product.price_in_vouchers} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("product.taxRate")}
              secondary={
                <span>
                  {product.tax_name} ({(product.tax_rate * 100).toFixed(0)}%)
                </span>
              }
            />
          </ListItem>
        </List>
      </Paper>
      <ConfirmDialog
        title={t("product.delete")}
        body={t("product.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteProduct}
      />
    </DetailLayout>
  );
};
