import { Account, selectAccountById, useListSystemAccountsQuery } from "@/api";
import { AccountRoutes } from "@/app/routes";
import { ButtonLink } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Card, CardActions, CardContent, Grid, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { SystemAccounts } from "@stustapay/models";
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
  const { data, isLoading: isAccountsLoading } = useListSystemAccountsQuery({ nodeId: currentNode.id });

  if (!data || isAccountsLoading) {
    return <Loading />;
  }

  return (
    <Grid container spacing={2}>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountById(data, SystemAccounts.CASH_VAULT)} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountById(data, SystemAccounts.SUMUP)} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountById(data, SystemAccounts.SALE_EXIT)} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountById(data, SystemAccounts.IMBALANCE)} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountById(data, SystemAccounts.CASH_ENTRY)} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountById(data, SystemAccounts.DEPOSIT)} />
      </Grid>
      <Grid item sm={4} md={2}>
        <BalanceCard account={selectAccountById(data, SystemAccounts.SUMUP_CUSTOMER_TOPUP)} />
      </Grid>
    </Grid>
  );
};
