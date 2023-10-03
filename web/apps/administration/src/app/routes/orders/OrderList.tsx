import { selectOrderAll, useListOrdersQuery } from "@/api";
import { ListLayout } from "@/components";
import { OrderTable } from "@/components/features";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const OrderList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { orders, isLoading: isOrdersLoading } = useListOrdersQuery(
    { nodeId: currentNode.id },
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
