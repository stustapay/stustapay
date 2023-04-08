import * as React from "react";
import { Paper, ListItem, ListItemText, List, ListItemSecondaryAction } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { selectCashierById, useGetCashierByIdQuery, selectTillById, useGetTillsQuery } from "@api";
import { Loading } from "@components/Loading";
import { ButtonLink, IconButtonLink, ListItemLink } from "@components";
import { Edit as EditIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useCurrencyFormatter } from "@hooks";

export const CashierDetail: React.FC = () => {
  const { t } = useTranslation(["cashiers", "common"]);
  const { cashierId } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { cashier, error, isLoading } = useGetCashierByIdQuery(Number(cashierId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      cashier: data ? selectCashierById(data, Number(cashierId)) : undefined,
    }),
  });
  const { data: tills, isLoading: isTillsLoading, error: tillError } = useGetTillsQuery();

  if (error || tillError) {
    navigate(-1);
    toast.error("Error while loading cashier");
    return null;
  }

  if (!cashier || isLoading || isTillsLoading) {
    return <Loading />;
  }

  const getTill = (id: number) => {
    if (!tills) {
      return undefined;
    }
    return selectTillById(tills, id);
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <>
              {cashier.cash_drawer_balance !== 0 && (
                <ButtonLink to={`/cashiers/${cashierId}/close-out`}>{t("cashier.closeOut")}</ButtonLink>
              )}
              <IconButtonLink to={`/cashiers/${cashierId}/edit`} color="primary" sx={{ mr: 1 }}>
                <EditIcon />
              </IconButtonLink>
            </>
          }
        >
          <ListItemText primary={cashier.name} />
        </ListItem>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText primary={t("cashier.name")} secondary={cashier.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("cashier.description")} secondary={cashier.description} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("cashier.tagId")} secondary={cashier.user_tag_id} />
          </ListItem>
          {cashier.till_id ? (
            <ListItemLink to={`/tills/${getTill(cashier.till_id)?.id}`}>
              <ListItemText primary={t("cashier.till")} secondary={getTill(cashier.till_id)?.name} />
            </ListItemLink>
          ) : (
            <ListItem>
              <ListItemText primary={t("cashier.till")} secondary={t("cashier.notLoggedInAtTill")} />
            </ListItem>
          )}
          <ListItem>
            <ListItemText
              primary={t("cashier.cashDrawerBalance")}
              secondary={formatCurrency(cashier.cash_drawer_balance)}
            />
            {cashier.cash_drawer_balance !== 0 && (
              <ListItemSecondaryAction>
                <ButtonLink to={`/cashiers/${cashierId}/close-out`}>{t("cashier.closeOut")}</ButtonLink>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        </List>
      </Paper>
    </>
  );
};
