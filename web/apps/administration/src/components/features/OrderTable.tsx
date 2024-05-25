import { Order } from "@/api";
import { OrderRoutes } from "@/app/routes";
import { useCurrencyFormatter } from "@/hooks";
import {
  AddCard as AddCardIcon,
  ShoppingCart as ShoppingCartIcon,
  ConfirmationNumber as TicketIcon,
} from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DataGridTitle } from "@stustapay/components";
import { formatDate } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface OrderListProps {
  orders: Order[];
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

export const OrderTable: React.FC<OrderListProps> = ({ orders }) => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  const columns: GridColDef<Order>[] = [
    {
      field: "id",
      headerName: t("order.id") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={OrderRoutes.detail(params.row.id)}>
          {params.row.id}
        </Link>
      ),
      width: 100,
    },
    {
      field: "order_type",
      headerName: t("order.type") as string,
      width: 140,
      renderCell: ({ row }) => {
        const icon = orderTypeToIcon[row.order_type];
        if (icon) {
          return <Tooltip title={row.order_type}>{icon}</Tooltip>;
        }
        return row.order_type;
      },
    },
    {
      field: "payment_method",
      headerName: t("order.paymentMethod") as string,
      width: 150,
    },
    {
      field: "total_no_tax",
      headerName: t("order.totalNoTax") as string,
      align: "right",
      valueFormatter: ({ value }) => formatCurrency(value),
      width: 150,
    },
    {
      field: "total_tax",
      headerName: t("order.totalTax") as string,
      align: "right",
      valueFormatter: ({ value }) => formatCurrency(value),
      width: 100,
    },
    {
      field: "total_price",
      headerName: t("order.totalPrice") as string,
      align: "right",
      valueFormatter: ({ value }) => formatCurrency(value),
      width: 100,
    },
    {
      field: "booked_at",
      headerName: t("order.bookedAt") as string,
      type: "string",
      valueGetter: ({ value }) => formatDate(value),
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
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
