import { usePendingPayoutDetailQuery } from "@/api";
import { useCurrencyFormatter, useCurrentNode } from "@hooks";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const PendingPayoutDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { data: pendingPayoutDetail } = usePendingPayoutDetailQuery({ nodeId: currentNode.id });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6">{t("payoutRun.pendingPayoutDetails")}</Typography>
      <List>
        {pendingPayoutDetail ? (
          <ListItem>
            <ListItemText
              primary={t("payoutRun.totalDonationAmount")}
              secondary={formatCurrency(pendingPayoutDetail.total_donation_amount)}
            />
            <ListItemText
              primary={t("payoutRun.totalPayoutAmount")}
              secondary={formatCurrency(pendingPayoutDetail.total_payout_amount)}
            />
            <ListItemText primary={t("payoutRun.nPayouts")} secondary={pendingPayoutDetail.n_payouts} />
          </ListItem>
        ) : (
          <Loading />
        )}
      </List>
    </Paper>
  );
};
