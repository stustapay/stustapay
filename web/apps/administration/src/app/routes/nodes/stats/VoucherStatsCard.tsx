import { Alert, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useGetFreeTicketStatsQuery, useGetVoucherStatsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";

const statCellSx = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
} as const;

export interface VoucherStatsCardProps {
  fromTimestamp?: string;
  toTimestamp?: string;
  pollingInterval?: number;
}

export const VoucherStatsCard: React.FC<VoucherStatsCardProps> = ({
  fromTimestamp,
  toTimestamp,
  pollingInterval = 0,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const {
    data: voucherData,
    error: voucherError,
    isLoading: isVoucherLoading,
  } = useGetVoucherStatsQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp,
      toTimestamp: toTimestamp,
    },
    { pollingInterval }
  );
  const {
    data: freeTicketData,
    error: freeTicketError,
    isLoading: isFreeTicketLoading,
  } = useGetFreeTicketStatsQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp,
      toTimestamp: toTimestamp,
    },
    { pollingInterval }
  );

  if (isVoucherLoading || isFreeTicketLoading) {
    return <Loading />;
  }

  if (voucherError || freeTicketError || !voucherData || !freeTicketData) {
    return <Alert severity="error">{t("overview.statsLoadError")}</Alert>;
  }

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Typography variant="h6" component="div">
              {t("overview.voucherStats")}
            </Typography>
            <Grid container>
              <Grid size={{ xs: 6 }} sx={statCellSx}>
                <Typography variant="subtitle1">{t("overview.vouchersIssued")}</Typography>
                <Typography variant="body1">{voucherData.vouchers_issued}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }} sx={statCellSx}>
                <Typography variant="subtitle1">{t("overview.vouchersSpent")}</Typography>
                <Typography variant="body1">{voucherData.vouchers_spent}</Typography>
              </Grid>
            </Grid>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="h6" component="div">
              {t("overview.freeTicketStats")}
            </Typography>
            <Grid container>
              <Grid size={{ xs: 6 }} sx={statCellSx}>
                <Typography variant="subtitle1">{t("overview.freeTicketsIssued")}</Typography>
                <Typography variant="body1">{freeTicketData.free_tickets_issued}</Typography>
              </Grid>
            </Grid>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
