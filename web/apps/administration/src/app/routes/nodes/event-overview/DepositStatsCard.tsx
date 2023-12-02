import { useGetProductStatsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Alert, Card, CardContent, List, ListItem, ListItemText, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export interface DepositStatsCardProps {
  fromTimestamp?: string;
  toTimestamp?: string;
}

export const DepositStatsCard: React.FC<DepositStatsCardProps> = ({ fromTimestamp, toTimestamp }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data, error } = useGetProductStatsQuery({
    nodeId: currentNode.id,
    fromTimestamp: fromTimestamp,
    toTimestamp: toTimestamp,
  });

  if (!data) {
    return <Loading />;
  }

  if (error) {
    return <Alert severity="error">Error loading stats</Alert>;
  }

  const deposits = data.product_quantities.filter((product) => product.is_returnable);

  return (
    <Card sx={{ height: 300 }}>
      <CardContent>
        <Typography gutterBottom variant="h6" component="div">
          {t("overview.depositBalance")}
        </Typography>
      </CardContent>
      <List>
        {deposits.map((deposit) => (
          <ListItem key={deposit.id}>
            <ListItemText primary={deposit.name} secondary={deposit.quantity_sold} />
          </ListItem>
        ))}
      </List>
    </Card>
  );
};
