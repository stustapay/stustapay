import {
  Paper,
  ListItem,
  IconButton,
  Typography,
  ListItemText,
  List,
  Tooltip,
  Divider,
  Stack,
  Tab,
  Box,
} from "@mui/material";
import { ConfirmDialog, ConfirmDialogCloseHandler, IconButtonLink } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  useGetTillLayoutByIdQuery,
  useDeleteTillLayoutMutation,
  useGetTillButtonsQuery,
  selectTillLayoutById,
  selectTillButtonById,
  useGetTicketsQuery,
  selectTicketById,
} from "@api";
import { Loading } from "@stustapay/components";
import { Ticket, TillButton } from "@stustapay/models";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useCurrencyFormatter } from "@hooks";

export const TillLayoutDetail: React.FC = () => {
  const { t } = useTranslation();
  const { layoutId } = useParams();
  const formatCurrency = useCurrencyFormatter();
  const navigate = useNavigate();
  const [deleteLayout] = useDeleteTillLayoutMutation();
  const { layout, error } = useGetTillLayoutByIdQuery(Number(layoutId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      layout: data ? selectTillLayoutById(data, Number(layoutId)) : undefined,
    }),
  });
  const { data: buttons, error: buttonsError } = useGetTillButtonsQuery();
  const { data: tickets, error: ticketsError } = useGetTicketsQuery();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  const [selectedTab, setSelectedTab] = React.useState<"buttons" | "tickets">("buttons");

  if (error || buttonsError || ticketsError) {
    return <Navigate to="/till-layouts" />;
  }

  const openConfirmDeleteDialog = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDeleteLayout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm") {
      deleteLayout(Number(layoutId)).then(() => navigate("/till-layouts"));
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
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              <IconButtonLink to={`/till-layouts/${layoutId}/edit`} color="primary" sx={{ mr: 1 }}>
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
          <ListItemText primary={layout.name} />
        </ListItem>
      </Paper>
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
    </Stack>
  );
};
