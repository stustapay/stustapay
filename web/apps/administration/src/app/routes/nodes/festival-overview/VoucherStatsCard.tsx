import * as React from "react";
import { Grid, Alert, Card, CardContent, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useGetProductStatsQuery } from "@api";
import { Loading } from "@stustapay/components";

export interface VoucherStatsCardProps {
  fromTimestamp?: string;
  toTimestamp?: string;
}

export const VoucherStatsCard: React.FC<VoucherStatsCardProps> = ({ fromTimestamp, toTimestamp }) => {
  const { t } = useTranslation();
  const { data, error } = useGetProductStatsQuery({
    fromTimestamp: fromTimestamp,
    toTimestamp: toTimestamp,
  });

  if (!data) {
    return <Loading />;
  }

  if (error) {
    return <Alert severity="error">Error loading stats</Alert>;
  }

  return (
    <Card sx={{ height: 300 }}>
      <CardContent>
        <Typography gutterBottom variant="h6" component="div">
          {t("overview.voucherStats")}
        </Typography>
      </CardContent>
      <Grid container>
        <Grid
          item
          xs={6}
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          <Typography variant="h6">{t("overview.vouchersIssued")}</Typography>
          <Typography variant="body1">{data.voucher_stats.vouchers_issued}</Typography>
        </Grid>
        <Grid
          item
          xs={6}
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          <Typography variant="h6">{t("overview.vouchersSpent")}</Typography>
          <Typography variant="body1">{data.voucher_stats.vouchers_spent}</Typography>
        </Grid>
      </Grid>
    </Card>
  );
};
