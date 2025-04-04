import { useGetCustomersWithBlockedPayoutQuery } from "@/api";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { CustomerTable } from "./components/CustomerTable";
import { Loading } from "@stustapay/components";

export const CustomersWithBlockedPayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: customers } = useGetCustomersWithBlockedPayoutQuery({ nodeId: currentNode.id });

  return (
    <DetailLayout title={t("customer.customersWithBlockedPayout")}>
      {customers ? <CustomerTable customers={customers} /> : <Loading />}
    </DetailLayout>
  );
};
