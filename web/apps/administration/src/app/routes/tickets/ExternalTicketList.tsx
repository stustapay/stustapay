import { ExternalTicket, useListExternalTicketsQuery } from "@/api";
import { CustomerRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Link, Tooltip } from "@mui/material";
import { Loading } from "@stustapay/components";
import { DataGrid, GridColDef } from "@stustapay/framework";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const ExternalTicketList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: tickets, isLoading: isTicketsLoading } = useListExternalTicketsQuery({ nodeId: currentNode.id });

  if (isTicketsLoading) {
    return <Loading />;
  }

  const columns: GridColDef<ExternalTicket>[] = [
    {
      field: "id",
      headerName: t("common.id"),
      type: "number",
    },
    {
      field: "external_reference",
      headerName: t("externalTicket.externalReference"),
      type: "boolean",
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
      field: "has_checked_in",
      headerName: t("externalTicket.hasCheckedIn"),
      type: "boolean",
    },
  ];

  return (
    <ListLayout title={t("externalTicket.presaleTickets")}>
      <DataGrid
        rows={tickets ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
