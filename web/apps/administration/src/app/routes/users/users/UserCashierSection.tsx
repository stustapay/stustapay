import { Box, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  selectCashierShiftAll,
  selectCashRegisterById,
  useGetCashierShiftsQuery,
  useListCashRegistersAdminQuery,
  User,
} from "@/api";
import { CashRegistersRoutes, UserRoutes } from "@/app/routes";
import { CashierShiftTable } from "@/app/routes/cashiers";
import { ButtonLink, DetailField, DetailNumberField, DetailView } from "@/components";

export const isActiveCashier = (cashier: User, shiftCount: number): boolean => {
  return (
    cashier.cash_register_id != null ||
    cashier.terminal_ids.length > 0 ||
    (cashier.cash_drawer_balance ?? 0) !== 0 ||
    shiftCount > 0
  );
};

export const UserCashierSection: React.FC<{ cashier: User }> = ({ cashier }) => {
  const { t } = useTranslation();

  const {
    cashierShifts,
    isLoading: isShiftsLoading,
    error: shiftsError,
  } = useGetCashierShiftsQuery(
    { nodeId: cashier.node_id, cashierId: cashier.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        cashierShifts: data ? selectCashierShiftAll(data) : undefined,
      }),
    }
  );
  const {
    data: registers,
    isLoading: isRegistersLoading,
    error: registerError,
  } = useListCashRegistersAdminQuery({ nodeId: cashier.node_id });

  if (shiftsError || registerError) {
    return null;
  }

  if (!cashierShifts || !registers || isShiftsLoading || isRegistersLoading) {
    return <Loading />;
  }

  if (!isActiveCashier(cashier, cashierShifts.length)) {
    return null;
  }

  const renderRegister = (id?: number | null) => {
    if (id == null) {
      return "";
    }

    const register = selectCashRegisterById(registers, id);
    if (!register) {
      return "";
    }

    return register.name;
  };

  return (
    <DetailView>
      <Typography variant="h6" sx={{ p: 1 }}>
        {t("cashier.cashierInfo")}
      </Typography>
      <DetailNumberField
        label={t("cashier.cashDrawerBalance")}
        type="currency"
        value={cashier.cash_drawer_balance ?? 0}
        secondaryAction={
          cashier.cash_drawer_balance !== 0 &&
          cashier.cash_drawer_balance != null && (
            <ButtonLink to={UserRoutes.detailAction(cashier.id, "close-out", cashier.node_id)}>
              {t("cashier.closeOut")}
            </ButtonLink>
          )
        }
      />
      {cashier.cash_register_id != null && (
        <DetailField
          label={t("cashier.cashRegister")}
          value={renderRegister(cashier.cash_register_id)}
          linkTo={CashRegistersRoutes.detail(cashier.cash_register_id)}
        />
      )}
      <Typography variant="h6" sx={{ p: 1 }}>
        {t("cashier.shifts")}
      </Typography>
      <Box sx={{ p: 2 }}>
        <CashierShiftTable cashierShifts={cashierShifts} showCashRegisterColumn />
      </Box>
    </DetailView>
  );
};
