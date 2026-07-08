import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon, LockOpen as UnlockIcon } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import {
  Ticket,
  selectTaxRateById,
  selectTicketAll,
  selectUserTagVariantEntities,
  useDeleteTicketMutation,
  useListTaxRatesQuery,
  useListTicketsQuery,
  useListUserTagVariantsQuery,
  useUpdateTicketMutation,
} from "@/api";
import { TicketRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

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
  const { data: userTagVariants } = useListUserTagVariantsQuery({ nodeId: currentNode.id });
  const [updateTicket] = useUpdateTicketMutation();
  const [deleteTicket] = useDeleteTicketMutation();
  const { dataGridNodeColumn } = useRenderNode();

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

  const handleToggleLockTicket = (ticket: Ticket) => {
    updateTicket({
      nodeId: currentNode.id,
      ticketId: ticket.id,
      newTicket: { ...ticket, is_locked: !ticket.is_locked },
    });
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

  const formatUserTagVariant = React.useCallback(
    (variantIds: number[]) => {
      const variantId = variantIds[0];
      if (variantId == null) {
        return "";
      }
      const userTagVariant = userTagVariants ? selectUserTagVariantEntities(userTagVariants)[variantId] : undefined;
      return userTagVariant?.variant_name ?? String(variantId);
    },
    [userTagVariants]
  );

  const columns: GridColDef<Ticket>[] = [
    {
      field: "name",
      headerName: t("ticket.name"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TicketRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "is_locked",
      headerName: t("ticket.isLocked"),
      type: "boolean",
    },
    {
      field: "price",
      headerName: t("ticket.price"),
      type: "currency",
    },
    {
      field: "initial_top_up_amount",
      headerName: t("ticket.initialTopUpAmount"),
      type: "currency",
    },
    {
      field: "tax_rate_id",
      headerName: t("ticket.taxRate"),
      align: "right",
      renderCell: (params) => renderTaxRate(params.row.tax_rate_id),
    },
    {
      field: "total_price",
      headerName: t("ticket.totalPrice"),
      type: "currency",
    },
    {
      field: "user_tag_variant_ids",
      headerName: t("ticket.restriction"),
      valueFormatter: (value) => formatUserTagVariant(value as number[]),
      width: 150,
    },
    dataGridNodeColumn,
  ];

  if (canManageTickets) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
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
                icon={
                  params.row.is_locked ? (
                    <Tooltip title={t("ticket.unlock")}>
                      <UnlockIcon />
                    </Tooltip>
                  ) : (
                    <Tooltip title={t("ticket.lock")}>
                      <LockIcon />
                    </Tooltip>
                  )
                }
                color="primary"
                label={t("ticket.lock")}
                onClick={() => handleToggleLockTicket(params.row)}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon color="error" />}
                label={t("delete")}
                disabled={params.row.is_locked}
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
        loading={isTicketsLoading}
        rows={tickets ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
