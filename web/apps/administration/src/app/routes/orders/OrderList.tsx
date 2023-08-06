import { selectOrderAll, useListOrdersQuery } from "@/api";
import { OrderTable } from "@/components/features";
import { ListLayout } from "@components";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

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
    <ListLayout title={t("orders")}>
      <OrderTable orders={orders ?? []} />
    </ListLayout>
  );
};
