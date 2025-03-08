import {
  selectCashierShiftById,
  selectCashRegisterById,
  selectUserById,
  useGetCashierQuery,
  useGetCashierShiftsQuery,
  useListCashRegistersAdminQuery,
  useListUsersQuery,
} from "@/api";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { CashierShiftStatsOverview } from "./CashierShiftStatsOverview";
import { CashierRoutes, CashRegistersRoutes, UserRoutes } from "@/app/routes";

export const CashierShiftDetail: React.FC = () => {
  const { t } = useTranslation();
  const { cashierId, shiftId } = useParams();
  const { currentNode } = useCurrentNode();

  const { data: cashier } = useGetCashierQuery({ nodeId: currentNode.id, cashierId: Number(cashierId) });
  const { cashierShift } = useGetCashierShiftsQuery(
    { nodeId: currentNode.id, cashierId: Number(cashierId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        cashierShift: data ? selectCashierShiftById(data, Number(shiftId)) : undefined,
      }),
    }
  );
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: registers } = useListCashRegistersAdminQuery({ nodeId: currentNode.id });

  if (cashierShift === undefined || cashier === undefined || users === undefined || registers === undefined) {
    return <Loading />;
  }

  const closingOutUser = selectUserById(users, cashierShift.closing_out_user_id);
  const cashRegister =
    cashierShift.cash_register_id != null ? selectCashRegisterById(registers, cashierShift.cash_register_id) : null;

  return (
    <DetailLayout title={getUserName(cashier)} routes={CashierRoutes}>
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
      <CashierShiftStatsOverview cashierId={Number(cashierId)} shiftId={Number(shiftId)} />
    </DetailLayout>
  );
};
