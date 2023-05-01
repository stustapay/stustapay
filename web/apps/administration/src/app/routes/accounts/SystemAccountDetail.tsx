import * as React from "react";
import { Paper, ListItem, ListItemText, List } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { selectAccountById, useGetAccountByIdQuery } from "@api";
import { Loading } from "@stustapay/components";
import { toast } from "react-toastify";
import { useCurrencyFormatter } from "@hooks";

export const SystemAccountDetail: React.FC = () => {
  const { t } = useTranslation(["accounts", "common"]);
  const { accountId } = useParams();
  const navigate = useNavigate();

  const formatCurrency = useCurrencyFormatter();

  const {
    account,
    error,
    isLoading: isAccountLoading,
  } = useGetAccountByIdQuery(Number(accountId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      account: data ? selectAccountById(data, Number(accountId)) : undefined,
    }),
  });

  if (isAccountLoading || (!account && !error)) {
    return <Loading />;
  }

  if (error || !account) {
    toast.error("Error loading account");
    navigate(-1);
    return null;
  }

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={account.id} />
        </ListItem>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("account.id")} secondary={account.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.type")} secondary={account.type} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.user_tag_uid")} secondary={String(account.user_tag_uid)} />
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
    </>
  );
};
