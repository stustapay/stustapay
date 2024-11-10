import {
  Ticket,
  selectTaxRateById,
  selectTicketAll,
  useDeleteTicketMutation,
  useListTaxRatesQuery,
  useListTicketsQuery,
  useUpdateTicketMutation,
} from "@/api";
import { TicketRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TicketList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTickets = useCurrentUserHasPrivilege(TicketRoutes.privilege);
  const canManageTicketsAtNode = useCurrentUserHasPrivilegeAtNode(TicketRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { tickets, isLoading: isTicketsLoading } = useListTicketsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        tickets: data ? selectTicketAll(data) : undefined,
      }),
    }
  );
  const { data: taxRates } = useListTaxRatesQuery({ nodeId: currentNode.id });
  const [updateTicket] = useUpdateTicketMutation();
  const [deleteTicket] = useDeleteTicketMutation();
  const renderNode = useRenderNode();

  if (isTicketsLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (ticketId: number) => {
    openModal({
      type: "confirm",
      title: t("ticket.delete"),
      content: t("ticket.deleteDescription"),
      onConfirm: () => {
        deleteTicket({ nodeId: currentNode.id, ticketId })
          .unwrap()
          .catch(() => undefined);
        return true;
      },
    });
  };

  const handleLockTicket = (ticket: Ticket) => {
    updateTicket({ nodeId: currentNode.id, ticketId: ticket.id, newTicket: { ...ticket, is_locked: true } });
  };

  const renderTaxRate = (id: number) => {
    if (!taxRates) {
      return "";
    }

    const tax = selectTaxRateById(taxRates, id);
    if (!tax) {
      return "";
    }

    return (
      <Tooltip title={tax.description}>
        <span>{(tax.rate * 100).toFixed(0)} %</span>
      </Tooltip>
    );
  };

  const columns: GridColDef<Ticket>[] = [
    {
      field: "name",
      headerName: t("ticket.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TicketRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "is_locked",
      headerName: t("ticket.isLocked") as string,
      type: "boolean",
    },
    {
      field: "price",
      headerName: t("ticket.price") as string,
      type: "currency",
    },
    {
      field: "initial_top_up_amount",
      headerName: t("ticket.initialTopUpAmount") as string,
      type: "currency",
    },
    {
      field: "tax_rate_id",
      headerName: t("ticket.taxRate") as string,
      align: "right",
      renderCell: (params) => renderTaxRate(params.row.tax_rate_id),
    },
    {
      field: "total_price",
      headerName: t("ticket.totalPrice") as string,
      type: "currency",
    },
    {
      field: "restrictions",
      headerName: t("ticket.restriction") as string,
      width: 150,
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: (value) => renderNode(value),
      flex: 1,
    },
  ];

  if (canManageTickets) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) =>
        canManageTicketsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TicketRoutes.edit(params.row.id))}
              />,
              <GridActionsCellItem
                icon={<LockIcon />}
                color="primary"
                disabled={params.row.is_locked}
                label={t("ticket.lock")}
                onClick={() => handleLockTicket(params.row)}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                color="error"
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("tickets")} routes={TicketRoutes}>
      <DataGrid
        autoHeight
        rows={tickets ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
