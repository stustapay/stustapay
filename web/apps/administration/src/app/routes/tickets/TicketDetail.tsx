import { useDeleteTicketMutation, useGetTicketQuery, useUpdateTicketMutation } from "@/api";
import { TicketRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, DetailLayout } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon } from "@mui/icons-material";
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
  const [updateTicket] = useUpdateTicketMutation();
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

  const handleLockTicket = () => {
    updateTicket({ nodeId: currentNode.id, ticketId: ticket.id, newTicket: { ...ticket, is_locked: true } });
  };

  return (
    <DetailLayout
      title={ticket.name}
      routes={TicketRoutes}
      elementNodeId={ticket.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TicketRoutes.edit(ticketId)),
          color: "primary",
          icon: <EditIcon />,
        },
        {
          label: t("ticket.lock"),
          disabled: ticket.is_locked,
          onClick: handleLockTicket,
          color: "error",
          icon: <LockIcon />,
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
            <ListItemText
              primary={t("ticket.restriction")}
              secondary={ticket.restrictions.length > 0 ? ticket.restrictions[0] : ""}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("ticket.initialTopUpAmount")}
              secondary={formatCurrency(ticket.initial_top_up_amount)}
            />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("ticket.price")} secondary={formatCurrency(ticket.price)} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("ticket.taxRate")}
              secondary={
                <span>
                  {ticket.tax_name} ({(ticket.tax_rate * 100).toFixed(0)}%)
                </span>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("ticket.totalPrice")} secondary={formatCurrency(ticket.total_price)} />
          </ListItem>
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
