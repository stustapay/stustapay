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
import { DetailField, DetailLayout, DetailView } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, List, ListItem, ListItemText, Paper, Tab } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
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
  const openModal = useOpenModal();
  const [deleteLayout] = useDeleteTillLayoutMutation();
  const { data: layout, error } = useGetTillLayoutQuery({ nodeId: currentNode.id, layoutId: Number(layoutId) });
  const { data: buttons, error: buttonsError } = useListTillButtonsQuery({ nodeId: currentNode.id });
  const { data: tickets, error: ticketsError } = useListTicketsQuery({ nodeId: currentNode.id });

  const [selectedTab, setSelectedTab] = React.useState("buttons");

  if (error || buttonsError || ticketsError) {
    return <Navigate to={TillLayoutRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("layout.delete"),
      content: t("layout.deleteDescription"),
      onConfirm: () => {
        deleteLayout({ nodeId: currentNode.id, layoutId: Number(layoutId) }).then(() =>
          navigate(TillLayoutRoutes.list())
        );
      },
    });
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
      routes={TillLayoutRoutes}
      elementNodeId={layout.node_id}
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
      <DetailView>
        <DetailField label={t("layout.name")} value={layout.name} />
        <DetailField label={t("layout.description")} value={layout.description} />
      </DetailView>
      {(sortedButtons.length > 0 || sortedTickets.length > 0) && (
        <Paper>
          <TabContext value={selectedTab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList onChange={(_, val) => setSelectedTab(val)}>
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
    </DetailLayout>
  );
};
