import { selectTillById, selectUserById, Transaction, useListTillsQuery, useListUsersQuery } from "@/api";
import { CashierRoutes, OrderRoutes, TillRoutes } from "@/app/routes";
import { useCurrentNode } from "@/hooks";
import {
  AddCard as AddCardIcon,
  ShoppingCart as ShoppingCartIcon,
  ConfirmationNumber as TicketIcon,
} from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { DataGrid, DataGridTitle, GridColDef } from "@stustapay/framework";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface TransactionTableProps {
  transactions: Transaction[];
  showShadow?: boolean;
  showTillColumn?: boolean;
  showCashierColumn?: boolean;
}

const orderTypeToIcon: Record<string, React.ReactElement> = {
  // "cancel_sale":,
  // "money_transfer":,
  // "money_transfer_imbalance":,
  // "pay_out":,
  sale: <ShoppingCartIcon />,
  ticket: <TicketIcon />,
  top_up: <AddCardIcon />,
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  showShadow = false,
  showTillColumn = false,
  showCashierColumn = false,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: tills } = useListTillsQuery({ nodeId: currentNode.id });

  if (!users || !tills) {
    return <Loading />;
  }

  const getUsernameForUser = (id?: number | null) => {
    if (id == null || users == null) {
      return "";
    }

    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  const columns: GridColDef<Transaction>[] = [
    {
      field: "id",
      headerName: t("order.id"),
      renderCell: ({ row }) => {
        if (row.order) {
          return (
            <Link component={RouterLink} to={OrderRoutes.detail(row.order.id)}>
              {row.id}
            </Link>
          );
        }
        return row.id;
      },
      width: 100,
    },
    {
      field: "order.order_type",
      headerName: t("order.type"),
      width: 140,
      renderCell: ({ row }) => {
        if (!row.order) {
          return "transaction";
        }
        const icon = orderTypeToIcon[row.order.order_type];
        if (icon) {
          return <Tooltip title={row.order.order_type}>{icon}</Tooltip>;
        }
        return row.order.order_type;
      },
    },
    {
      field: "payment_method",
      headerName: t("order.paymentMethod"),
      valueGetter: (_, row) => row.order?.payment_method,
      width: 150,
    },
    ...(showCashierColumn
      ? ([
          {
            field: "cashier_id",
            headerName: t("common.cashier"),
            type: "string",
            renderCell: ({ row }: GridRenderCellParams<Transaction>) => {
              if (row.order?.cashier_id == null) {
                return null;
              }
              return (
                <RouterLink to={CashierRoutes.detail(row.order.cashier_id)}>
                  {getUsernameForUser(row.order.cashier_id)}
                </RouterLink>
              );
            },
            width: 200,
          },
        ] as const)
      : ([] as const)),
    ...(showTillColumn
      ? ([
          {
            field: "order.till_id",
            headerName: t("common.till"),
            type: "string",
            renderCell: ({ row }: GridRenderCellParams<Transaction>) => {
              if (row.order?.till_id == null) {
                return null;
              }
              return (
                <RouterLink to={TillRoutes.detail(row.order.till_id)}>
                  {selectTillById(tills, row.order.till_id)?.name}
                </RouterLink>
              );
            },
            width: 200,
          },
        ] as const)
      : ([] as const)),
    {
      field: "total_no_tax",
      headerName: t("order.totalNoTax"),
      type: "currency",
      valueGetter: (_, row) => row.order?.total_no_tax,
      width: 150,
    },
    {
      field: "total_tax",
      headerName: t("order.totalTax"),
      type: "currency",
      valueGetter: (_, row) => row.order?.total_tax,
      width: 100,
    },
    {
      field: "total_price",
      headerName: t("order.totalPrice"),
      type: "currency",
      valueGetter: (_, row) => row.order?.total_price ?? row.amount,
      width: 100,
    },
    {
      field: "booked_at",
      headerName: t("order.bookedAt"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      minWidth: 150,
      flex: 1,
    },
  ];

  return (
    <DataGrid
      rows={transactions ?? []}
      slots={{ toolbar: () => <DataGridTitle title={t("transactions")} /> }}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: showShadow ? (theme) => theme.shadows[1] : undefined }}
    />
  );
};
