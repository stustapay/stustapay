import { IconButton, List, ListItem, ListItemText, Paper, Stack, Tooltip } from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink, ListItemLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDeleteTicketMutation, useGetTicketQuery } from "@api";
import { Loading } from "@stustapay/components";
import { useCurrencyFormatter } from "@hooks";
import { ProductRoutes, TicketRoutes } from "@/app/routes";

export const TicketDetail: React.FC = () => {
  const { t } = useTranslation();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const [deleteTicket] = useDeleteTicketMutation();
  const { data: ticket, error } = useGetTicketQuery({ ticketId: Number(ticketId) });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to={TicketRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTicket: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTicket({ ticketId: Number(ticketId) }).then(() => navigate(TicketRoutes.list()));
    }
    setShowConfirmDelete(false);
  };

  if (ticket === undefined) {
    return <Loading />;
  }

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={TicketRoutes.edit(ticketId)} color="primary">
                <EditIcon />
              </IconButtonLink>
              <Tooltip title={t("delete")}>
                <IconButton onClick={openConfirmDeleteDialog} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          }
        >
          <ListItemText primary={ticket.name} />
        </ListItem>
      </Paper>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("ticket.name")} secondary={ticket.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("ticket.description")} secondary={ticket.description} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("ticket.restriction")} secondary={ticket.restriction} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("ticket.initialTopUpAmount")}
              secondary={formatCurrency(ticket.initial_top_up_amount)}
            />
          </ListItem>
          <ListItemLink to={ProductRoutes.detail(ticket.product_id)}>
            <ListItemText primary={t("ticket.product")} secondary={ticket.product_name} />
          </ListItemLink>
        </List>
      </Paper>
      <ConfirmDialog
        title={t("ticket.delete")}
        body={t("ticket.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteTicket}
      />
    </Stack>
  );
};
