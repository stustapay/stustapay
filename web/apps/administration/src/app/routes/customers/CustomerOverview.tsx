import { DashboardOverview, PendingPayoutDetail, useGetDashboardOverviewQuery, usePendingPayoutDetailQuery } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { AccountRoutes, CustomerRoutes, PayoutRunRoutes, UserTagRoutes } from "@/app/routes";
import { ButtonLink, DetailField, DetailNumberField, DetailView } from "@/components";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import {
  AccountBalanceWallet as AccountBalanceWalletIcon,
  CreditCard as CreditCardIcon,
  Groups as GroupsIcon,
  Nfc as NfcIcon,
  Payments as PaymentsIcon,
  Search as SearchIcon,
  Sell as SellIcon,
  Wallet as WalletIcon,
} from "@mui/icons-material";
import { Alert, Box, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Privilege } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

type MetricCardProps = {
  icon: React.ElementType;
  label: string;
  value: string;
};

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value }) => {
  return (
    <Paper sx={{ p: 2.5, height: "100%" }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
            color: "primary.main",
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Paper>
  );
};

type ActionCardProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  to: string;
};

const ActionCard: React.FC<ActionCardProps> = ({ icon: Icon, title, description, cta, to }) => {
  return (
    <Paper sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
            color: "primary.main",
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Typography variant="h6">{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      <Box sx={{ mt: "auto" }}>
        <ButtonLink variant="outlined" to={to}>
          {cta}
        </ButtonLink>
      </Box>
    </Paper>
  );
};

const OverviewMetricsSection: React.FC<{
  isLoading: boolean;
  isError: boolean;
  overview?: DashboardOverview;
}> = ({ isLoading, isError, overview }) => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();

  if (isLoading && !overview) {
    return (
      <Box
        data-testid="customer-overview-kpi-loading"
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
        }}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={124} />
        ))}
      </Box>
    );
  }

  if (isError || !overview) {
    return <Alert severity="info">{t("overview.noDataAvailable")}</Alert>;
  }

  const metrics = [
    {
      label: t("overview.totalGuestCredit"),
      value: formatCurrency(overview.total_guest_credit),
      icon: WalletIcon,
    },
    {
      label: t("overview.guestsWithCredit"),
      value: overview.guests_with_credit.toString(),
      icon: GroupsIcon,
    },
    {
      label: t("overview.guestsPaidOut"),
      value: overview.guests_paid_out.toString(),
      icon: PaymentsIcon,
    },
    {
      label: t("overview.onlineDonation"),
      value: formatCurrency(overview.online_donation),
      icon: SellIcon,
    },
    {
      label: t("overview.onlineForPayout"),
      value: formatCurrency(overview.online_for_payout),
      icon: CreditCardIcon,
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        },
      }}
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.label} icon={metric.icon} label={metric.label} value={metric.value} />
      ))}
    </Box>
  );
};

const PendingPayoutCard: React.FC<{
  isLoading: boolean;
  isError: boolean;
  detail?: PendingPayoutDetail;
}> = ({ isLoading, isError, detail }) => {
  const { t } = useTranslation();

  return (
    <DetailView sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" sx={{ px: 2, pt: 1, pb: 1 }}>
        {t("customer.pendingPayoutOverview")}
      </Typography>
      {isLoading && !detail ? (
        <Box data-testid="customer-overview-payout-loading" sx={{ px: 2, pb: 2 }}>
          <Skeleton variant="text" height={40} />
          <Skeleton variant="text" height={40} />
          <Skeleton variant="text" height={40} />
        </Box>
      ) : isError || !detail ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="info">{t("overview.noDataAvailable")}</Alert>
        </Box>
      ) : (
        <>
          <DetailNumberField label={t("payoutRun.totalPayoutAmount")} type="currency" value={detail.total_payout_amount} />
          <DetailNumberField
            label={t("payoutRun.totalDonationAmount")}
            type="currency"
            value={detail.total_donation_amount}
          />
          <DetailField label={t("payoutRun.nPayouts")} value={detail.n_payouts} />
        </>
      )}
    </DetailView>
  );
};

export const CustomerOverview = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
  } = useGetDashboardOverviewQuery({ nodeId: currentNode.id });
  const {
    data: pendingPayoutDetail,
    isLoading: isPendingPayoutLoading,
    isError: isPendingPayoutError,
  } = usePendingPayoutDetailQuery({ nodeId: currentNode.id });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {t("customer.overviewTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("customer.overviewIntro")}
        </Typography>
        <OverviewMetricsSection isLoading={isOverviewLoading} isError={isOverviewError} overview={overview} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            lg: "repeat(2, minmax(0, 1fr))",
          },
        }}
      >
        <PendingPayoutCard
          isLoading={isPendingPayoutLoading}
          isError={isPendingPayoutError}
          detail={pendingPayoutDetail}
        />
        <DetailView sx={{ p: 2, height: "100%" }}>
          <Typography variant="h6" sx={{ px: 2, pt: 1, pb: 1 }}>
            {t("customer.supportGuide")}
          </Typography>
          <DetailField label={t("customer.customers")} value={t("customer.supportCustomersDescription")} />
          <DetailField label={t("accounts")} value={t("customer.supportAccountsDescription")} />
          <DetailField label={t("userTag.userTags")} value={t("customer.supportUserTagsDescription")} />
        </DetailView>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("customer.quickActions")}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          <ActionCard
            icon={SearchIcon}
            title={t("common.search")}
            description={t("customer.searchCustomersDescription")}
            cta={t("customer.openSearch")}
            to={CustomerRoutes.action("search", currentNode.id)}
          />
          <ActionCard
            icon={PaymentsIcon}
            title={t("payoutRun.payoutRuns")}
            description={t("customer.payoutRunsDescription")}
            cta={t("customer.openPayoutRuns")}
            to={PayoutRunRoutes.list(currentNode.id)}
          />
          <ActionCard
            icon={AccountBalanceWalletIcon}
            title={t("accounts")}
            description={t("customer.accountsDescription")}
            cta={t("customer.openAccounts")}
            to={AccountRoutes.list(currentNode.id)}
          />
          <ActionCard
            icon={NfcIcon}
            title={t("userTag.userTags")}
            description={t("customer.userTagsDescription")}
            cta={t("customer.openUserTags")}
            to={UserTagRoutes.list(currentNode.id)}
          />
        </Box>
      </Box>
    </Stack>
  );
});
