import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { ArrayElement } from "@stustapay/utils";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { CustomerRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getExternalTicketCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const ExternalTicketList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: tickets, isLoading: isTicketsLoading } = useLiveQuery(
    (q) => q.from({ tickets: getExternalTicketCollection(currentNode.id) }),
    [currentNode.id],
  );

  const columns: GridColDef<ArrayElement<NonNullable<typeof tickets>>>[] = [
    {
      field: "id",
      headerName: t("common.id"),
      type: "number",
    },
    {
      field: "external_reference",
      headerName: t("externalTicket.externalReference"),
      type: "string",
      flex: 1,
      renderCell: ({ row: { external_reference, external_link } }) => {
        if (external_link) {
          return (
            <Link href={external_link} target="_blank">
              {external_reference}
            </Link>
          );
        }
        return external_reference;
      },
    },
    {
      field: "token",
      headerName: t("externalTicket.token"),
      renderCell: ({ row: { token } }) => (
        <Tooltip title={token}>
          <span>{token}</span>
        </Tooltip>
      ),
    },
    {
      field: "ticket_type",
      headerName: t("externalTicket.type"),
      type: "string",
    },
    {
      field: "created_at",
      headerName: t("externalTicket.createdAt"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      minWidth: 200,
    },
    {
      field: "customer_account_id",
      headerName: t("externalTicket.customerAccount"),
      renderCell: ({ row: { customer_account_id } }) => (
        <Link component={RouterLink} to={CustomerRoutes.detail(customer_account_id)}>
          {customer_account_id}
        </Link>
      ),
    },
    {
      field: "pretix_product_name",
      headerName: t("externalTicket.ticketProduct", "Ticket"),
      flex: 1,
      valueGetter: (_value, row) => row.pretix_product_name ?? "",
    },
    {
      field: "customer_name",
      headerName: t("externalTicket.customerName", "Customer"),
      flex: 1,
      valueGetter: (_value, row) => row.customer_name ?? "",
    },
    {
      field: "customer_email",
      headerName: t("externalTicket.customerEmail", "Email"),
      flex: 1,
      valueGetter: (_value, row) => row.customer_email ?? "",
    },
    {
      field: "initial_top_up_amount",
      headerName: t("externalTicket.topUpAmount", "Top-Up"),
      type: "number",
      valueFormatter: (value: number) => (value > 0 ? `${value.toFixed(2)}€` : "—"),
    },
    {
      field: "has_checked_in",
      headerName: t("externalTicket.hasCheckedIn"),
      type: "boolean",
    },
    {
      field: "cancelled",
      headerName: t("externalTicket.cancelled", "Cancelled"),
      type: "boolean",
    },
  ];

  return (
    <ListLayout title={t("externalTicket.presaleTickets")}>
      <DataGrid
        loading={isTicketsLoading}
        rows={tickets ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
