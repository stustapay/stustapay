import { Paper, ListItem, IconButton, Typography, ListItemText, List, Tooltip } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetTerminalLayoutByIdQuery, useDeleteTerminalLayoutMutation, useGetProductsQuery } from "@api";
import { Loading } from "@components/Loading";
import { Product } from "@models";

export const TerminalLayoutDetail: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const [deleteLayout] = useDeleteTerminalLayoutMutation();
  const { data: layout, error } = useGetTerminalLayoutByIdQuery(Number(layoutId));
  const { data: products, error: productsError } = useGetProductsQuery();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error || productsError) {
    return <Navigate to="/terminal-layouts" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteLayout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteLayout(Number(layoutId)).then(() => navigate("/terminal-layouts"));
    }
    setShowConfirmDelete(false);
  };

  if (layout === undefined || products === undefined) {
    return <Loading />;
  }

  const sortedProducts =
    layout.products == null
      ? []
      : [...layout.products]
          .sort((a, b) => a.sequence_number - b.sequence_number)
          .map((i) => products.find((p) => p.id === i.product_id) as Product);

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/terminal-layouts/${layoutId}/edit`} color="primary" sx={{ mr: 1 }}>
                <EditIcon />
              </IconButtonLink>
              <Tooltip title={t("delete", { ns: "common" })}>
                <IconButton onClick={openConfirmDeleteDialog} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          }
        >
          <ListItemText primary={layout.name} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("layoutName")} secondary={layout.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("layoutDescription")} secondary={layout.description} />
          </ListItem>
        </List>
      </Paper>
      {sortedProducts.length > 0 && (
        <Paper sx={{ mt: 2 }}>
          <List>
            {sortedProducts.map((product) => (
              <ListItem>
                <ListItemText primary={product.name} secondary={`${product.price}€`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      <ConfirmDialog
        title={t("deleteLayout")}
        body={t("deleteLayoutDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteLayout}
      />
    </>
  );
};
