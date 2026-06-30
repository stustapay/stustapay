import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import {
  selectCashierShiftById,
  selectCashRegisterById,
  selectUserById,
  useGetCashierShiftsQuery,
  useGetUserQuery,
  useListCashRegistersAdminQuery,
  useListUsersQuery,
} from "@/api";
import { CashRegistersRoutes, UserRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";

import { CashierShiftStatsOverview } from "./CashierShiftStatsOverview";

export const CashierShiftDetail: React.FC = () => {
  const { t } = useTranslation();
  const { userId, shiftId } = useParams();
  const { currentNode } = useCurrentNode();

  const { data: user } = useGetUserQuery({ nodeId: currentNode.id, userId: Number(userId) });
  const { cashierShift } = useGetCashierShiftsQuery(
    { nodeId: currentNode.id, cashierId: Number(userId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        cashierShift: data ? selectCashierShiftById(data, Number(shiftId)) : undefined,
      }),
    }
  );
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: registers } = useListCashRegistersAdminQuery({ nodeId: currentNode.id });

  if (cashierShift === undefined || user === undefined || users === undefined || registers === undefined) {
    return <Loading />;
  }

  const closingOutUser = selectUserById(users, cashierShift.closing_out_user_id);
  const cashRegister =
    cashierShift.cash_register_id != null ? selectCashRegisterById(registers, cashierShift.cash_register_id) : null;

  return (
    <DetailLayout title={getUserName(user)} routes={UserRoutes}>
      <DetailView>
        <DetailField label={t("shift.comment")} value={cashierShift.comment} />
        <DetailField label={t("shift.startedAt")} value={cashierShift.started_at} />
        <DetailField label={t("shift.endedAt")} value={cashierShift.ended_at} />
        <DetailField
          label={t("closeOut.closingOutUser")}
          value={getUserName(closingOutUser)}
          linkTo={UserRoutes.detail(cashierShift.closing_out_user_id)}
        />
        {cashRegister && (
          <DetailField
            label={t("shift.cashRegister")}
            value={cashRegister.name}
            linkTo={CashRegistersRoutes.detail(cashierShift.cash_register_id)}
          />
        )}
        <DetailNumberField
          label={t("shift.actualCashDrawerBalance")}
          type="currency"
          value={cashierShift.actual_cash_drawer_balance}
        />
        <DetailNumberField
          label={t("shift.expectedCashDrawerBalance")}
          type="currency"
          value={cashierShift.expected_cash_drawer_balance}
        />
        <DetailNumberField
          label={t("shift.cashDrawerImbalance")}
          type="currency"
          value={cashierShift.cash_drawer_imbalance}
        />
      </DetailView>
      <CashierShiftStatsOverview cashierId={Number(userId)} shiftId={Number(shiftId)} />
    </DetailLayout>
  );
};
