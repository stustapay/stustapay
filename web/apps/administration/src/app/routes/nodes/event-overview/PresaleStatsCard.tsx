import { useGetPresaleStatsQuery } from "@/api";
import { useCurrentNode, useCurrencyFormatter } from "@/hooks";
import { Card, CardContent, Grid, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const PresaleStatsCard: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { data: ticketStats } = useGetPresaleStatsQuery({ nodeId: currentNode.id });

  if (!ticketStats) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t("overview.presaleStats", "Presale Tickets")}
        </Typography>
        <Grid container spacing={2}>
          <Grid size={4}>
            <Typography variant="body2" color="text.secondary">
              {t("overview.presaleTotal", "Total")}
            </Typography>
            <Typography variant="h5">{ticketStats.total_tickets}</Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="body2" color="text.secondary">
              {t("overview.presaleCheckedIn", "Checked In")}
            </Typography>
            <Typography variant="h5">{ticketStats.checked_in_tickets}</Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="body2" color="text.secondary">
              {t("overview.presaleCancelled", "Cancelled")}
            </Typography>
            <Typography variant="h5">{ticketStats.cancelled_tickets}</Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="body2" color="text.secondary">
              {t("overview.presaleTotalTopUp", "Total Credit Sold")}
            </Typography>
            <Typography variant="h5">{formatCurrency(ticketStats.total_credit_sold)}</Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="body2" color="text.secondary">
              {t("overview.presaleActiveTopUp", "Credit Activated")}
            </Typography>
            <Typography variant="h5">{formatCurrency(ticketStats.credit_activated)}</Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="body2" color="text.secondary">
              {t("overview.presalePendingTopUp", "Credit Pending")}
            </Typography>
            <Typography variant="h5">{formatCurrency(ticketStats.credit_pending)}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
