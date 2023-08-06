import * as React from "react";
import { List, ListItem, ListItemText, Paper, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Account } from "@api";
import { useCurrencyFormatter } from "@hooks";

export const SystemAccountDetail: React.FC<{ account: Account }> = ({ account }) => {
  const { t } = useTranslation();

  const formatCurrency = useCurrencyFormatter();

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={account.name} />
        </ListItem>
      </Paper>
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
    </Stack>
  );
};
