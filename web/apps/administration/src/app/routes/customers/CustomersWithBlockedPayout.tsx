import * as React from "react";
import { useTranslation } from "react-i18next";

import { useGetCustomersWithBlockedPayoutQuery } from "@/api";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { CustomerTable } from "./components/CustomerTable";

export const CustomersWithBlockedPayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: customers, isLoading } = useGetCustomersWithBlockedPayoutQuery({ nodeId: currentNode.id });

  return (
    <DetailLayout title={t("customer.customersWithBlockedPayout")}>
      <CustomerTable customers={customers ?? []} loading={isLoading} />
    </DetailLayout>
  );
};
