import { usePendingPayoutDetailQuery } from "@/api";
import { DetailField, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const PendingPayoutDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: pendingPayoutDetail } = usePendingPayoutDetailQuery({ nodeId: currentNode.id });

  return (
    <DetailView sx={{ p: 3 }}>
      <Typography variant="h6">{t("payoutRun.pendingPayoutDetails")}</Typography>
      {pendingPayoutDetail ? (
        <>
          <DetailNumberField
            label={t("payoutRun.totalDonationAmount")}
            type="currency"
            value={pendingPayoutDetail.total_donation_amount}
          />
          <DetailNumberField
            label={t("payoutRun.totalPayoutAmount")}
            type="currency"
            value={pendingPayoutDetail.total_payout_amount}
          />
          <DetailField label={t("payoutRun.nPayouts")} value={pendingPayoutDetail.n_payouts} />
        </>
      ) : (
        <Loading />
      )}
    </DetailView>
  );
};
