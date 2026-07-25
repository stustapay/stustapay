import {
  AddCard as AddCardIcon,
  ShoppingCart as ShoppingCartIcon,
  ConfirmationNumber as TicketIcon,
} from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { DataGrid, GridColDef, DataGridTitle } from "@stustapay/framework";
import { getUserName } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { Order } from "@/api";
import { OrderRoutes, TillRoutes, UserRoutes } from "@/app/routes";
import {
  DEFAULT_PAGE_SIZE,
  getOrderCollection,
  getTillCollection,
  getUserCollection,
  usePaginatedQueryTotal,
} from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export interface OrderListProps {
  orders?: Order[];
  tillId?: number;
  customerAccountId?: number;
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
  orders: ordersProp,
  tillId,
  customerAccountId,
  showShadow = false,
  showTillColumn = false,
  showCashierColumn = false,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const usesCollection = ordersProp == null && (tillId != null || customerAccountId != null);
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const {
    data: queriedOrders,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
  } = useLiveQuery(
    (q) => {
      if (!usesCollection) {
        return undefined;
      }

      let query = q.from({ orders: getOrderCollection(currentNode.id) });
      if (tillId != null) {
        query = query.where(({ orders }) => eq(orders.till_id, tillId));
      }
      if (customerAccountId != null) {
        query = query.where(({ orders }) => eq(orders.customer_account_id, customerAccountId));
      }
      return query
        .orderBy(({ orders }) => orders.booked_at, "desc")
        .offset(paginationModel.page * paginationModel.pageSize)
        .limit(paginationModel.pageSize);
    },
    [
      usesCollection,
      currentNode.id,
      tillId,
      customerAccountId,
      paginationModel.page,
      paginationModel.pageSize,
    ],
  );

  const total = usePaginatedQueryTotal(currentNode.id, "orders");
  const orders = usesCollection ? (queriedOrders ?? []) : (ordersProp ?? []);
  const { data: users, isLoading: isUsersLoading } = useLiveQuery(
    (q) => q.from({ users: getUserCollection(currentNode.id) }),
    [currentNode.id],
  );
  const { data: tills, isLoading: isTillsLoading } = useLiveQuery(
    (q) => q.from({ tills: getTillCollection(currentNode.id) }),
    [currentNode.id],
  );

  const getUsernameForUser = (id?: number | null) => {
    if (id == null || users == null) {
      return "";
    }

    const user = users.find((u) => u.id === id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  const columns: GridColDef<Order>[] = [
    {
      field: "id",
      headerName: t("order.id"),
      renderCell: ({ row }) => {
        let nodeId = null;
        if (row.till_id != null) {
          nodeId = tills?.find((till) => till.id === row.till_id)?.node_id ?? null;
        }
        return (
          <Link component={RouterLink} to={OrderRoutes.detail(row.id, nodeId)}>
            {row.id}
          </Link>
        );
      },
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
                <RouterLink to={UserRoutes.detail(row.cashier_id)}>
                  {getUsernameForUser(row.cashier_id)}
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
            field: "till_id",
            headerName: t("common.till"),
            type: "string",
            renderCell: ({ row }: GridRenderCellParams<Order>) => {
              if (row.till_id == null) {
                return null;
              }
              return (
                <RouterLink to={TillRoutes.detail(row.till_id)}>
                  {tills?.find((till) => till.id === row.till_id)?.name ?? null}
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

  if (usesCollection && isOrdersError) {
    return null;
  }

  return (
    <DataGrid
      autoHeight
      loading={isUsersLoading || isTillsLoading || (usesCollection && isOrdersLoading)}
      rows={orders}
      rowCount={usesCollection ? total : orders.length}
      paginationMode={usesCollection ? "server" : "client"}
      paginationModel={usesCollection ? paginationModel : undefined}
      onPaginationModelChange={usesCollection ? setPaginationModel : undefined}
      pageSizeOptions={[10, 25, 50, 100]}
      slots={{ toolbar: () => <DataGridTitle title={t("orders")} /> }}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ boxShadow: showShadow ? (theme) => theme.shadows[1] : undefined }}
    />
  );
};
