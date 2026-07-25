import {
  AddCard as AddCardIcon,
  ShoppingCart as ShoppingCartIcon,
  ConfirmationNumber as TicketIcon,
} from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { DataGrid, DataGridTitle, GridColDef } from "@stustapay/framework";
import { ArrayElement } from "@stustapay/utils";
import { eq, materialize, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { OrderRoutes, TillRoutes, TransactionRoutes } from "@/app/routes";
import { UserCell, userValueGetter } from "@/components/table/UserCell";
import {
  DEFAULT_PAGE_SIZE,
  getTillCollection,
  getTransactionCollection,
  getUserCollection,
  usePaginatedQueryTotal,
} from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export interface TransactionTableProps {
  cashRegisterId: number;
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
  cashRegisterId,
  showShadow = false,
  showTillColumn = false,
  showCashierColumn = false,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const {
    data: rows,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ transactions: getTransactionCollection(currentNode.id) })
        .where(({ transactions }) => eq(transactions.cash_register_id, cashRegisterId))
        .orderBy(({ transactions }) => transactions.booked_at, "desc")
        .offset(paginationModel.page * paginationModel.pageSize)
        .limit(paginationModel.pageSize)
        .select(({ transactions: transactionRow }) => ({
          ...transactionRow,
          cashier: materialize(
            q
              .from({ users: getUserCollection(currentNode.id) })
              .where(({ users }) =>
                transactionRow.order?.cashier_id != null
                  ? eq(users.id, transactionRow.order.cashier_id)
                  : eq(users.id, -1),
              )
              .select(({ users }) => users)
              .findOne(),
          ),
          till: materialize(
            q
              .from({ tills: getTillCollection(currentNode.id) })
              .where(({ tills }) =>
                transactionRow.order?.till_id != null
                  ? eq(tills.id, transactionRow.order.till_id)
                  : eq(tills.id, -1),
              )
              .select(({ tills }) => tills)
              .findOne(),
          ),
        })),
    [currentNode.id, cashRegisterId, paginationModel.page, paginationModel.pageSize],
  );

  const total = usePaginatedQueryTotal(currentNode.id, "transactions");

  if (isError) {
    return null;
  }

  type TransactionRow = ArrayElement<NonNullable<typeof rows>>;

  const columns: GridColDef<TransactionRow>[] = [
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
        return (
          <Link component={RouterLink} to={TransactionRoutes.detail(row.id)}>
            {row.id}
          </Link>
        );
      },
      width: 100,
    },
    {
      field: "order.order_type",
      headerName: t("order.type"),
      width: 140,
      renderCell: ({ row }) => {
        if (!row.order) {
          return (
            <Tooltip title={row.description}>
              <span>transaction</span>
            </Tooltip>
          );
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
            valueGetter: (_, row) => userValueGetter(row.cashier),
            renderCell: ({ row }: GridRenderCellParams<TransactionRow>) => (
              <UserCell user={row.cashier} nodeId={currentNode.id} />
            ),
            width: 200,
          },
        ] satisfies GridColDef<TransactionRow>[])
      : []),
    ...(showTillColumn
      ? ([
          {
            field: "order.till_id",
            headerName: t("common.till"),
            type: "string",
            valueGetter: (_, row) => row.till?.name ?? "",
            renderCell: ({ row }: GridRenderCellParams<TransactionRow>) => {
              const till = row.till;
              if (till == null) {
                return null;
              }
              return (
                <RouterLink to={TillRoutes.detail(till.id, till.node_id)}>{till.name}</RouterLink>
              );
            },
            width: 200,
          },
        ] satisfies GridColDef<TransactionRow>[])
      : []),
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
      loading={isLoading}
      rows={rows ?? []}
      rowCount={total}
      paginationMode="server"
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      pageSizeOptions={[10, 25, 50, 100]}
      slots={{ toolbar: () => <DataGridTitle title={t("transactions")} /> }}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ boxShadow: showShadow ? (theme) => theme.shadows[1] : undefined }}
    />
  );
};
