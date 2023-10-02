import { useDeleteTicketMutation, useGetTicketQuery } from "@/api";
import { ProductRoutes, TicketRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, DetailLayout, ListItemLink } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const TicketDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const [deleteTicket] = useDeleteTicketMutation();
  const { data: ticket, error } = useGetTicketQuery({ nodeId: currentNode.id, ticketId: Number(ticketId) });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to={TicketRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteTicket: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteTicket({ nodeId: currentNode.id, ticketId: Number(ticketId) }).then(() => navigate(TicketRoutes.list()));
    }
    setShowConfirmDelete(false);
  };

  if (ticket === undefined) {
    return <Loading />;
  }

  return (
    <DetailLayout
      title={ticket.name}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TicketRoutes.edit(ticketId)),
          color: "primary",
          icon: <EditIcon />,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
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
    </DetailLayout>
  );
};
