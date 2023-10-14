import { Account } from "@/api";
import { DetailLayout } from "@/components";
import { useCurrencyFormatter } from "@/hooks";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const SystemAccountDetail: React.FC<{ account: Account }> = ({ account }) => {
  const { t } = useTranslation();

  const formatCurrency = useCurrencyFormatter();

  return (
    <DetailLayout title={account.name ?? ""}>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("account.id")} secondary={account.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.type")} secondary={account.type} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.name")} secondary={account.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.comment")} secondary={account.comment} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.balance")} secondary={formatCurrency(account.balance)} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.vouchers")} secondary={account.vouchers} />
          </ListItem>
        </List>
      </Paper>
    </DetailLayout>
  );
};
