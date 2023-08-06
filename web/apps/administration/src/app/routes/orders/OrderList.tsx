import * as React from "react";
import { ListItem, ListItemText, Paper, Stack } from "@mui/material";
import { selectOrderAll, useListOrdersQuery } from "@/api";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { OrderTable } from "@/components/features";

export const OrderList: React.FC = () => {
  const { t } = useTranslation();

  const { orders, isLoading: isOrdersLoading } = useListOrdersQuery(
    {},
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        orders: data ? selectOrderAll(data) : undefined,
      }),
    }
  );

  if (isOrdersLoading) {
    return <Loading />;
  }

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={t("orders")} />
        </ListItem>
      </Paper>
      <OrderTable orders={orders ?? []} />
    </Stack>
  );
};
