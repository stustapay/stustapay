import { Checkbox, Chip, IconButton, List, ListItem, ListItemText, Paper, Stack, Tooltip } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDeleteProductMutation, useGetProductQuery, useUpdateProductMutation } from "@api";
import { Loading } from "@stustapay/components";
import { useCurrencyFormatter } from "@hooks";

export const ProductDetail: React.FC = () => {
  const { t } = useTranslation();
  const { productId } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const [deleteProduct] = useDeleteProductMutation();
  const { data: product, error } = useGetProductQuery({ productId: Number(productId) });
  const [updateProduct] = useUpdateProductMutation();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to="/products" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteProduct: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteProduct({ productId: Number(productId) }).then(() => navigate("/products"));
    }
    setShowConfirmDelete(false);
  };

  if (product === undefined) {
    return <Loading />;
  }

  const handleLockProduct = () => {
    updateProduct({ productId: product.id, newProduct: { ...product, is_locked: true } });
  };

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <Tooltip title={t("edit")}>
                <span>
                  <IconButtonLink to={`/products/${productId}/edit`} color="primary">
                    <EditIcon />
                  </IconButtonLink>
                </span>
              </Tooltip>
              <Tooltip title={t("product.lock")}>
                <span>
                  <IconButton disabled={product.is_locked} onClick={handleLockProduct} color="error">
                    <LockIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t("delete")}>
                <span>
                  <IconButton disabled={product.is_locked} onClick={openConfirmDeleteDialog} color="error">
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          }
        >
          <ListItemText primary={product.name} />
        </ListItem>
      </Paper>
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
    </Stack>
  );
};
