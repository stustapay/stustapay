import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { UserRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView, UserDetailField } from "@/components";
import { CashRegisterCell } from "@/components/table/CashRegisterCell";
import { getCashierShiftCollection, getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { CashierShiftStatsOverview } from "./CashierShiftStatsOverview";

export const CashierShiftDetail: React.FC = () => {
  const { t } = useTranslation();
  const { userId, shiftId } = useParams();
  const { currentNode } = useCurrentNode();

  const { data: cashierShift, isLoading: isShiftLoading } = useLiveQuery(
    (q) =>
      q
        .from({ shifts: getCashierShiftCollection(currentNode.id) })
        .where(({ shifts }) => eq(shifts.cashier_id, Number(userId)))
        .where(({ shifts }) => eq(shifts.id, Number(shiftId)))
        .join(
          { closingOutUsers: getUserCollection(currentNode.id) },
          ({ closingOutUsers, shifts }) => eq(shifts.closing_out_user_id, closingOutUsers.id),
          "left" as const
        )
        .select(({ closingOutUsers, shifts }) => ({
          ...shifts,
          closingOutUser: closingOutUsers,
        }))
        .findOne(),
    [currentNode.id, userId, shiftId]
  );
  const { data: user, isLoading: isUserLoading } = useLiveQuery(
    (q) =>
      q
        .from({ users: getUserCollection(currentNode.id) })
        .where(({ users }) => eq(users.id, Number(userId)))
        .findOne(),
    [currentNode.id, userId]
  );

  if (isShiftLoading || cashierShift == null || isUserLoading || user === undefined) {
    return <Loading />;
  }

  return (
    <DetailLayout title={getUserName(user)} routes={UserRoutes}>
      <DetailView>
        <DetailField label={t("shift.comment")} value={cashierShift.comment} />
        <DetailField label={t("shift.startedAt")} value={cashierShift.started_at} />
        <DetailField label={t("shift.endedAt")} value={cashierShift.ended_at} />
        <UserDetailField
          label={t("closeOut.closingOutUser")}
          user={cashierShift.closingOutUser}
          fallbackNodeId={currentNode.id}
        />
        {cashierShift.cash_register_id != null && (
          <DetailField
            label={t("shift.cashRegister")}
            value={<CashRegisterCell registerId={cashierShift.cash_register_id} />}
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
