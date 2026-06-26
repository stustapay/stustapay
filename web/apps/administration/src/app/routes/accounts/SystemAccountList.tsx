import { NodePrivilege } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { selectAccountAll, useListSystemAccountsQuery } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { AccountTable } from "./components/AccountTable";

export const SystemAccountList: React.FC = withPrivilegeGuard(NodePrivilege.node_administration, () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { products: accounts, isLoading: isAccountsLoading } = useListSystemAccountsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        products: data ? selectAccountAll(data) : undefined,
      }),
    }
  );

  return (
    <ListLayout title={t("systemAccounts")}>
      <AccountTable accounts={accounts ?? []} loading={isAccountsLoading} />
    </ListLayout>
  );
});
