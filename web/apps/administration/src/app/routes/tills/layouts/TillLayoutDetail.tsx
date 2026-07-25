import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, List, ListItem, ListItemText, Paper, Tab } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { TillLayoutRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components";
import {
  getTicketCollection,
  getTillButtonCollection,
  getTillLayoutCollection,
} from "@/db/collections";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";

export const TillLayoutDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { layoutId } = useParams();
  const formatCurrency = useCurrencyFormatter();
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const {
    data: layout,
    isLoading: isLayoutLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ layouts: getTillLayoutCollection(currentNode.id) })
        .where(({ layouts }) => eq(layouts.id, Number(layoutId)))
        .findOne(),
    [currentNode.id, layoutId],
  );
  const { data: buttons, isLoading: isButtonsLoading } = useLiveQuery(
    (q) =>
      q
        .from({ buttons: getTillButtonCollection(currentNode.id) })
        .where(({ buttons }) => inArray(buttons.id, layout?.button_ids ?? [])),
    [currentNode.id, layout?.button_ids],
  );
  const { data: tickets, isLoading: isTicketsLoading } = useLiveQuery(
    (q) =>
      q
        .from({ tickets: getTicketCollection(currentNode.id) })
        .where(({ tickets }) => inArray(tickets.id, layout?.ticket_ids ?? [])),
    [currentNode.id, layout?.ticket_ids],
  );

  const [selectedTab, setSelectedTab] = React.useState("buttons");

  if (isError) {
    return <Navigate to={TillLayoutRoutes.list()} />;
  }

  if (isLayoutLoading || isButtonsLoading || isTicketsLoading || !layout) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("layout.delete"),
      content: t("layout.deleteDescription"),
      onConfirm: () => {
        getTillLayoutCollection(currentNode.id)
          .delete(Number(layoutId))
          .isPersisted.promise.then(() => navigate(TillLayoutRoutes.list()));
      },
    });
  };

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
        {
          label: t("delete"),
          onClick: openConfirmDeleteDialog,
          color: "error",
          icon: <DeleteIcon />,
        },
      ]}
    >
      <DetailView>
        <DetailField label={t("layout.name")} value={layout.name} />
        <DetailField label={t("layout.description")} value={layout.description} />
      </DetailView>
      {(buttons.length > 0 || tickets.length > 0) && (
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
                {buttons.map((button) => (
                  <ListItem key={button.id}>
                    <ListItemText primary={button.name} secondary={formatCurrency(button.price)} />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
            <TabPanel value="tickets">
              <List>
                {tickets.map((ticket) => (
                  <ListItem key={ticket.id}>
                    <ListItemText
                      primary={ticket.name}
                      secondary={formatCurrency(ticket.total_price)}
                    />
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
