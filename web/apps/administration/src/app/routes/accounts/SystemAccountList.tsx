import * as React from "react";
import { Paper, ListItem, ListItemText } from "@mui/material";
import { selectAccountAll, useGetSystemAccountsQuery } from "@api";
import { useTranslation } from "react-i18next";
import { Loading } from "@components/Loading";
import { AccountTable } from "./components/AccountTable";

export const SystemAccountList: React.FC = () => {
  const { t } = useTranslation(["accounts", "common"]);

  const { products: accounts, isLoading: isAccountsLoading } = useGetSystemAccountsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      products: data ? selectAccountAll(data) : undefined,
    }),
  });

  if (isAccountsLoading) {
    return <Loading />;
  }

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={t("systemAccounts", { ns: "common" })} />
        </ListItem>
      </Paper>
      <AccountTable accounts={accounts ?? []} />
    </>
  );
};
