import { NodePrivilege } from "@stustapay/models";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { ListLayout } from "@/components";
import { getSystemAccountCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { AccountTable } from "./components/AccountTable";

export const SystemAccountList: React.FC = withPrivilegeGuard(NodePrivilege.node_administration, () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { data: accounts, isLoading: isAccountsLoading } = useLiveQuery(
    (q) => q.from({ accounts: getSystemAccountCollection(currentNode.id) }),
    [currentNode.id]
  );

  return (
    <ListLayout title={t("systemAccounts")}>
      <AccountTable accounts={accounts ?? []} loading={isAccountsLoading} />
    </ListLayout>
  );
});
