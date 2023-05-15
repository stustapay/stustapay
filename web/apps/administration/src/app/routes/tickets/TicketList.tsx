import * as React from "react";
import { Paper, ListItem, ListItemText, Stack } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { selectTicketAll, useDeleteTicketMutation, useGetTicketsQuery } from "@api";
import { useTranslation } from "react-i18next";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { Ticket } from "@stustapay/models";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Loading } from "@stustapay/components";
import { useCurrencyFormatter } from "src/hooks";

export const TicketList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { tickets, isLoading: isTicketsLoading } = useGetTicketsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      tickets: data ? selectTicketAll(data) : undefined,
    }),
  });
  const [deleteTicket] = useDeleteTicketMutation();

  const [ticketToDelete, setTicketToDelete] = React.useState<number | null>(null);
  if (isTicketsLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (ticketId: number) => {
    setTicketToDelete(ticketId);
  };

  const handleConfirmDeleteTicket: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && ticketToDelete !== null) {
      deleteTicket(ticketToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setTicketToDelete(null);
  };

  const columns: GridColDef<Ticket>[] = [
    {
      field: "name",
      headerName: t("ticket.name") as string,
      flex: 1,
      renderCell: (params) => <RouterLink to={`/tickets/${params.row.id}`}>{params.row.name}</RouterLink>,
    },
    {
      field: "description",
      headerName: t("ticket.description") as string,
      flex: 1,
    },
    {
      field: "product_id",
      headerName: t("ticket.product") as string,
      renderCell: (params) => (
        <RouterLink to={`/products/${params.row.product_id}`}>{params.row.product_name}</RouterLink>
      ),
      minWidth: 150,
    },
    {
      field: "price",
      headerName: t("ticket.price") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "initial_top_up_amount",
      headerName: t("ticket.initialTopUpAmount") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "total_price",
      headerName: t("ticket.totalPrice") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "restriction",
      headerName: t("ticket.restriction") as string,
      width: 150,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(`/tickets/${params.row.id}/edit`)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/tickets/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add")}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("tickets")} />
        </ListItem>
      </Paper>
      <DataGrid
        autoHeight
        rows={tickets ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("ticket.delete")}
        body={t("ticket.deleteDescription")}
        show={ticketToDelete !== null}
        onClose={handleConfirmDeleteTicket}
      />
    </Stack>
  );
};
