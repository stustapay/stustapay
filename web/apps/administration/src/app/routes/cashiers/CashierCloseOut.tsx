import * as React from "react";
import { Paper, ListItem, ListItemText, List } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { selectCashierById, useGetCashierByIdQuery, selectTillById, useGetTillsQuery } from "@api";
import { Loading } from "@components/Loading";
import { ButtonLink, IconButtonLink, ListItemLink } from "@components";
import { Edit as EditIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useCurrencyFormatter } from "@hooks";

export const CashierCloseOut: React.FC = () => {
  const { t } = useTranslation(["cashiers", "common"]);
  const { cashierId } = useParams();

  const formatCurrency = useCurrencyFormatter();

  const { cashier, error, isLoading } = useGetCashierByIdQuery(Number(cashierId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      cashier: data ? selectCashierById(data, Number(cashierId)) : undefined,
    }),
  });

  if (!cashier || isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={cashier.name} />
        </ListItem>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <List></List>
      </Paper>
    </>
  );
};
