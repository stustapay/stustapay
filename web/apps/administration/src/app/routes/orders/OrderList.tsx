import * as React from "react";
import { Paper, ListItem, ListItemText } from "@mui/material";
import { selectOrderAll, useGetOrdersQuery } from "@api";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { OrderTable } from "@components";

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

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={t("orders", { ns: "common" })} />
        </ListItem>
      </Paper>
      <OrderTable orders={orders ?? []} />
    </>
  );
};
