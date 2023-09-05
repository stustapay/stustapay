import {
  selectCashierShiftById,
  selectUserById,
  useGetCashierQuery,
  useGetCashierShiftsQuery,
  useListUsersQuery,
} from "@api";
import { DetailLayout } from "@components";
import { useCurrencyFormatter, useCurrentNode } from "@hooks";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { CashierShiftStatsOverview } from "./CashierShiftStatsOverview";

export const CashierShiftDetail: React.FC = () => {
  const { t } = useTranslation();
  const { cashierId, shiftId } = useParams();
  const formatCurrency = useCurrencyFormatter();
  const { currentNode } = useCurrentNode();

  const { data: cashier } = useGetCashierQuery({ nodeId: currentNode.id, cashierId: Number(cashierId) });
  const { cashierShift } = useGetCashierShiftsQuery(
    { cashierId: Number(cashierId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        cashierShift: data ? selectCashierShiftById(data, Number(shiftId)) : undefined,
      }),
    }
  );
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });

  if (cashierShift === undefined || cashier === undefined || users === undefined) {
    return <Loading />;
  }

  const renderUser = (id?: number | null) => {
    if (id == null || users == null) {
      return "";
    }

    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  return (
    <DetailLayout title={getUserName(cashier)}>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("shift.comment")} secondary={cashierShift.comment} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("shift.startedAt")} secondary={cashierShift.started_at} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("shift.endedAt")} secondary={cashierShift.ended_at} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("closeOut.closingOutUser")}
              secondary={renderUser(cashierShift.closing_out_user_id)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("shift.actualCashDrawerBalance")}
              secondary={formatCurrency(cashierShift.actual_cash_drawer_balance)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("shift.expectedCashDrawerBalance")}
              secondary={formatCurrency(cashierShift.expected_cash_drawer_balance)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("shift.cashDrawerImbalance")}
              secondary={formatCurrency(cashierShift.cash_drawer_imbalance)}
            />
          </ListItem>
        </List>
      </Paper>
      <CashierShiftStatsOverview cashierId={Number(cashierId)} shiftId={Number(shiftId)} />
    </DetailLayout>
  );
};
