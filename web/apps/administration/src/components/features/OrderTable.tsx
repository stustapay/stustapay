import { Order, selectTillById, selectUserById, useListTillsQuery, useListUsersQuery } from "@/api";
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
import { DataGrid, GridColDef, DataGridTitle } from "@stustapay/framework";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface OrderListProps {
  orders: Order[];
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

export const OrderTable: React.FC<OrderListProps> = ({
  orders,
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

  const columns: GridColDef<Order>[] = [
    {
      field: "id",
      headerName: t("order.id"),
      renderCell: (params) => (
        <Link component={RouterLink} to={OrderRoutes.detail(params.row.id)}>
          {params.row.id}
        </Link>
      ),
      width: 100,
    },
    {
      field: "order_type",
      headerName: t("order.type"),
      renderCell: ({ row }) => {
        const icon = orderTypeToIcon[row.order_type];
        if (icon) {
          return <Tooltip title={row.order_type}>{icon}</Tooltip>;
        }
        return row.order_type;
      },
    },
    {
      field: "uuid",
      headerName: t("order.uuid"),
      minWidth: 280,
    },
    {
      field: "payment_method",
      headerName: t("order.paymentMethod"),
      width: 150,
    },
    ...(showCashierColumn
      ? ([
          {
            field: "cashier_id",
            headerName: t("common.cashier"),
            type: "string",
            renderCell: ({ row }: GridRenderCellParams<Order>) => {
              if (row.cashier_id == null) {
                return null;
              }
              return (
                <RouterLink to={CashierRoutes.detail(row.cashier_id)}>{getUsernameForUser(row.cashier_id)}</RouterLink>
              );
            },
            width: 200,
          },
        ] as const)
      : ([] as const)),
    ...(showTillColumn
      ? ([
          {
            field: "till_id",
            headerName: t("common.till"),
            type: "string",
            renderCell: ({ row }: GridRenderCellParams<Order>) => {
              if (row.till_id == null) {
                return null;
              }
              return (
                <RouterLink to={TillRoutes.detail(row.till_id)}>{selectTillById(tills, row.till_id)?.name}</RouterLink>
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
      width: 150,
    },
    {
      field: "total_tax",
      headerName: t("order.totalTax"),
      type: "currency",
      width: 100,
    },
    {
      field: "total_price",
      headerName: t("order.totalPrice"),
      type: "currency",
      width: 100,
    },
    {
      field: "booked_at",
      headerName: t("order.bookedAt"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      flex: 1,
    },
  ];

  return (
    <DataGrid
      autoHeight
      rows={orders ?? []}
      slots={{ toolbar: () => <DataGridTitle title={t("orders")} /> }}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: showShadow ? (theme) => theme.shadows[1] : undefined }}
    />
  );
};
