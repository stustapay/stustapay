import {
  Ticket,
  selectTicketById,
  selectTillButtonById,
  useDeleteTillLayoutMutation,
  useGetTillLayoutQuery,
  useListTicketsQuery,
  useListTillButtonsQuery,
} from "@/api";
import { TillLayoutRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, DetailLayout } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, List, ListItem, ListItemText, Paper, Tab } from "@mui/material";
import { Loading } from "@stustapay/components";
import { TillButton } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const TillLayoutDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { layoutId } = useParams();
  const formatCurrency = useCurrencyFormatter();
  const navigate = useNavigate();
  const [deleteLayout] = useDeleteTillLayoutMutation();
  const { data: layout, error } = useGetTillLayoutQuery({ nodeId: currentNode.id, layoutId: Number(layoutId) });
  const { data: buttons, error: buttonsError } = useListTillButtonsQuery({ nodeId: currentNode.id });
  const { data: tickets, error: ticketsError } = useListTicketsQuery({ nodeId: currentNode.id });
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  const [selectedTab, setSelectedTab] = React.useState<"buttons" | "tickets">("buttons");

  if (error || buttonsError || ticketsError) {
    return <Navigate to={TillLayoutRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteLayout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteLayout({ nodeId: currentNode.id, layoutId: Number(layoutId) }).then(() =>
        navigate(TillLayoutRoutes.list())
      );
    }
    setShowConfirmDelete(false);
  };

  if (layout === undefined || buttons === undefined || tickets === undefined) {
    return <Loading />;
  }

  const sortedButtons =
    layout.button_ids == null ? [] : [...layout.button_ids].map((i) => selectTillButtonById(buttons, i) as TillButton);
  const sortedTickets =
    layout.ticket_ids == null ? [] : [...layout.ticket_ids].map((i) => selectTicketById(tickets, i) as Ticket);

  return (
    <DetailLayout
      title={layout.name}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TillLayoutRoutes.edit(layoutId)),
          color: "primary",
          icon: <EditIcon />,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("layout.name")} secondary={layout.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("layout.description")} secondary={layout.description} />
          </ListItem>
        </List>
      </Paper>
      {(sortedButtons.length > 0 || sortedTickets.length > 0) && (
        <Paper>
          <TabContext value={selectedTab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList onChange={(evt, val) => setSelectedTab(val as any)}>
                <Tab value="buttons" label={t("layout.buttons")} />
                <Tab value="tickets" label={t("layout.tickets")} />
              </TabList>
            </Box>
            <TabPanel value="buttons">
              <List>
                {sortedButtons.map((button) => (
                  <ListItem key={button.id}>
                    <ListItemText primary={button.name} secondary={formatCurrency(button.price)} />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
            <TabPanel value="tickets">
              <List>
                {sortedTickets.map((ticket) => (
                  <ListItem key={ticket.id}>
                    <ListItemText primary={ticket.name} secondary={formatCurrency(ticket.total_price)} />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          </TabContext>
        </Paper>
      )}
      <ConfirmDialog
        title={t("layout.delete")}
        body={t("layout.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteLayout}
      />
    </DetailLayout>
  );
};
