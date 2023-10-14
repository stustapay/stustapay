import { Account, AccountRead, AccountType, selectAccountAll, useListSystemAccountsQuery } from "@/api";
import { AccountRoutes } from "@/app/routes";
import { ButtonLink } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Card, CardActions, CardContent, Grid, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

interface BalanceCardProps {
  account?: Account;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ account }) => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  if (!account) {
    return (
      <Card>
        <Loading />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Grid container alignItems="center" justifyContent="center" direction="column">
          <Grid item>
            <Typography variant="h6" component="div">
              {account.name}
            </Typography>
          </Grid>
          <Grid item>
            <Typography component="span" variant="body1">
              {formatCurrency(account.balance)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions>
        <ButtonLink size="small" to={AccountRoutes.detail(account.id)}>
          {t("overview.showDetails")}
        </ButtonLink>
      </CardActions>
    </Card>
  );
};

export const MoneyOverview: React.FC = () => {
  const { currentNode } = useCurrentNode();
  const { accounts, isLoading: isAccountsLoading } = useListSystemAccountsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        accounts: data ? selectAccountAll(data) : undefined,
      }),
    }
  );

  if (!accounts || isAccountsLoading) {
    return <Loading />;
  }

  const selectAccountByType = (type: AccountType): AccountRead | undefined => {
    return accounts.find((a) => a.type === type);
  };

  return (
    <Grid container spacing={2}>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountByType("cash_vault")} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountByType("sumup_entry")} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountByType("sumup_online_entry")} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountByType("sale_exit")} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountByType("cash_imbalance")} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountByType("cash_entry")} />
      </Grid>
    </Grid>
  );
};
