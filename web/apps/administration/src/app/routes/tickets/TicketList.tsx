import { Delete as DeleteIcon, Edit as EditIcon, Lock as LockIcon, LockOpen as UnlockIcon } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { ArrayElement } from "@stustapay/utils";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TicketRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { TaxRateCell } from "@/components/table/TaxRateCell";
import { getTicketCollection, getUserTagVariantCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";

export const TicketList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTickets = useCurrentUserHasPrivilege(TicketRoutes.privilege);
  const canManageTicketsAtNode = useCurrentUserHasPrivilegeAtNode(TicketRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { data: tickets, isLoading: isTicketsLoading } = useLiveQuery(
    (q) => q.from({ tickets: getTicketCollection(currentNode.id) }),
    [currentNode.id]
  );
  const { data: userTagVariants, isLoading: isUserTagVariantsLoading } = useLiveQuery(
    (q) => q.from({ userTagVariants: getUserTagVariantCollection(currentNode.id) }),
    [currentNode.id]
  );
  const userTagVariantById = React.useMemo(
    () => new Map((userTagVariants ?? []).map((variant) => [variant.id, variant])),
    [userTagVariants]
  );
  const isLoading = isTicketsLoading || isUserTagVariantsLoading;
  const { dataGridNodeColumn } = useRenderNode();

  const openConfirmDeleteDialog = (ticketId: number) => {
    openModal({
      type: "confirm",
      title: t("ticket.delete"),
      content: t("ticket.deleteDescription"),
      onConfirm: () => {
        getTicketCollection(currentNode.id).delete(ticketId);
        return true;
      },
    });
  };

  const handleToggleLockTicket = (ticket: ArrayElement<NonNullable<typeof tickets>>) => {
    getTicketCollection(currentNode.id).update(ticket.id, (draft) => {
      draft.is_locked = !draft.is_locked;
    });
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof tickets>>>[] = [
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
      renderCell: (params) => <TaxRateCell taxRateId={params.row.tax_rate_id} />,
    },
    {
      field: "total_price",
      headerName: t("ticket.totalPrice"),
      type: "currency",
    },
    {
      field: "userTagVariant",
      headerName: t("ticket.restriction"),
      valueGetter: (_, row) => {
        const variantId = row.user_tag_variant_ids[0];
        if (variantId == null) {
          return "";
        }
        return userTagVariantById.get(variantId)?.variant_name ?? String(variantId);
      },
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
        loading={isLoading}
        rows={tickets ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
