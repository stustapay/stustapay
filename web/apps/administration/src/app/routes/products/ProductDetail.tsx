import { Paper, ListItem, IconButton, ListItemText, List, Tooltip, Checkbox, Chip } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetProductByIdQuery, useDeleteProductMutation, selectProductById, useLockProductMutation } from "@api";
import { Loading } from "@stustapay/components";
import { useCurrencyFormatter } from "@hooks";

export const ProductDetail: React.FC = () => {
  const { t } = useTranslation(["products", "common"]);
  const { productId } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const [deleteproduct] = useDeleteProductMutation();
  const [lockProduct] = useLockProductMutation();
  const { product, error } = useGetProductByIdQuery(Number(productId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      product: data ? selectProductById(data, Number(productId)) : undefined,
    }),
  });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to="/products" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteproduct: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteproduct(Number(productId)).then(() => navigate("/products"));
    }
    setShowConfirmDelete(false);
  };

  if (product === undefined) {
    return <Loading />;
  }

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/products/${productId}/edit`} color="primary">
                <EditIcon />
              </IconButtonLink>
              <Tooltip title={t("lockProduct")}>
                <IconButton disabled={product.is_locked} onClick={() => lockProduct(product)} color="error">
                  <LockIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("delete", { ns: "common" })}>
                <IconButton disabled={product.is_locked} onClick={openConfirmDeleteDialog} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          }
        >
          <ListItemText primary={product.name} />
        </ListItem>
      </Paper>
      <Paper sx={{ mt: 2 }}>
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
              secondary={product.restrictions.map((restriction) => (
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
                  {product.tax_name} ({product.tax_rate * 100}%)
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
        onClose={handleConfirmDeleteproduct}
      />
    </>
  );
};
