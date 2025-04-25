import { Account, AccountRead, AccountType, useGetMoneyOverviewQuery } from "@/api";
import { AccountRoutes } from "@/app/routes";
import { ButtonLink } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Card, CardActions, CardContent, Grid, Typography, useTheme } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

interface BalanceCardProps {
  amount: number;
  label?: string | null;
  actions?: React.ReactNode;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ amount, label, actions }) => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  return (
    <Card>
      <CardContent>
        <Grid container alignItems="center" justifyContent="center" direction="column">
          <Grid>
            <Typography variant="h6" component="div">
              {label}
            </Typography>
          </Grid>
          <Grid>
            <Typography component="span" variant="body1">
              {formatCurrency(amount)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      {actions && <CardActions>{actions}</CardActions>}
    </Card>
  );
};

interface AccountBalanceCardProps {
  account?: Account;
}

const AccountBalanceCard: React.FC<AccountBalanceCardProps> = ({ account }) => {
  const { t } = useTranslation();

  if (!account) {
    return null;
  }

  return (
    <BalanceCard
      amount={account.balance}
      label={account.name}
      actions={
        <ButtonLink size="small" to={AccountRoutes.detail(account.id)}>
          {t("overview.showDetails")}
        </ButtonLink>
      }
    />
  );
};

export const MoneyOverview: React.FC = () => {
  const theme = useTheme();
  const { currentNode } = useCurrentNode();
  const { data: moneyOverviewData, isLoading: isAccountsLoading } = useGetMoneyOverviewQuery({
    nodeId: currentNode.id,
  });

  if (!moneyOverviewData || isAccountsLoading) {
    return <Loading />;
  }

  const selectAccountByType = (type: AccountType): AccountRead | undefined => {
    return moneyOverviewData?.system_accounts.find((a) => a.type === type);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: theme.spacing(1) }}>
      <AccountBalanceCard account={selectAccountByType("cash_vault")} />
      <AccountBalanceCard account={selectAccountByType("sumup_entry")} />
      <AccountBalanceCard account={selectAccountByType("sumup_online_entry")} />
      <AccountBalanceCard account={selectAccountByType("sale_exit")} />
      <AccountBalanceCard account={selectAccountByType("cash_imbalance")} />
      <AccountBalanceCard account={selectAccountByType("cash_entry")} />
      <AccountBalanceCard account={selectAccountByType("cash_exit")} />
      <AccountBalanceCard account={selectAccountByType("sepa_exit")} />
      <AccountBalanceCard account={selectAccountByType("donation_exit")} />
      <BalanceCard label="Customer balance" amount={moneyOverviewData.total_customer_account_balance} />
      <BalanceCard label="Cash registers" amount={moneyOverviewData.total_cash_register_balance} />
    </div>
  );
};
