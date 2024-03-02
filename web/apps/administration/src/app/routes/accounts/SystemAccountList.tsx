import { selectAccountAll, useListSystemAccountsQuery } from "@/api";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { AccountTable } from "./components/AccountTable";
import { withPrivilegeGuard } from "@/app/layout";
import { Privilege } from "@stustapay/models";

export const SystemAccountList: React.FC = withPrivilegeGuard(Privilege.node_administration, () => {
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

  if (isAccountsLoading) {
    return <Loading />;
  }

  return (
    <ListLayout title={t("systemAccounts")}>
      <AccountTable accounts={accounts ?? []} />
    </ListLayout>
  );
});
