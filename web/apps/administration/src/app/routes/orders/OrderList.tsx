import * as React from "react";
import { Paper, ListItem, ListItemText } from "@mui/material";
import { DataGrid, GridColumns } from "@mui/x-data-grid";
import { selectOrderAll, useGetOrdersQuery } from "@api";
import { useTranslation } from "react-i18next";
import { Order } from "@models";
import { Loading } from "@components/Loading";

export const OrderList: React.FC = () => {
  const { t } = useTranslation(["orders", "common"]);

  const { products: orders, isLoading: isOrdersLoading } = useGetOrdersQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      products: data ? selectOrderAll(data) : undefined,
    }),
  });

  if (isOrdersLoading) {
    return <Loading />;
  }

  const columns: GridColumns<Order> = [
    {
      field: "id",
      headerName: t("orderId") as string,
      type: "number",
      width: 50,
    },
    {
      field: "status",
      headerName: t("orderStatus") as string,
      width: 100,
    },
    {
      field: "payment_method",
      headerName: t("orderPaymentMethod") as string,
      width: 50,
    },
    // {
    //   field: "actions",
    //   type: "actions",
    //   headerName: t("actions", { ns: "common" }) as string,
    //   width: 150,
    //   getActions: (params) => [],
    // },
  ];

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={t("orders", { ns: "common" })} />
        </ListItem>
      </Paper>
      <DataGrid
        autoHeight
        rows={orders ?? []}
        columns={columns}
        disableSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </>
  );
};
