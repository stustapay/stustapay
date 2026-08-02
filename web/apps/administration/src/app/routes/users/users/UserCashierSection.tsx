import { Box, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { User } from "@/api";
import { CashRegistersRoutes, UserRoutes } from "@/app/routes";
import { CashierShiftTable } from "@/app/routes/cashiers";
import { ButtonLink, DetailField, DetailNumberField, DetailView } from "@/components";
import { getCashRegisterCollection } from "@/db/collections";

export const isActiveCashier = (cashier: User): boolean => {
  return cashier.cash_register_id != null;
};

export const UserCashierSection: React.FC<{ cashier: User }> = ({ cashier }) => {
  const { t } = useTranslation();

  const {
    data: register,
    isLoading: isRegisterLoading,
    isError: registerError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ registers: getCashRegisterCollection(cashier.node_id) })
        .where(({ registers }) => eq(registers.id, cashier.cash_register_id ?? -1))
        .findOne(),
    [cashier.node_id, cashier.cash_register_id]
  );

  if (registerError) {
    return null;
  }

  if (cashier.cash_register_id != null && (isRegisterLoading || !register)) {
    return <Loading />;
  }

  if (!isActiveCashier(cashier)) {
    return <CashierShiftTable cashierId={cashier.id} showCashRegisterColumn hideWhenEmpty />;
  }

  return (
    <DetailView>
      <Typography variant="h6" sx={{ p: 1 }}>
        {t("cashier.cashierInfo")}
      </Typography>
      {register != null && (
        <>
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
          <DetailField
            label={t("cashier.cashRegister")}
            value={register.name}
            linkTo={CashRegistersRoutes.detail(register.id, register.node_id)}
          />
        </>
      )}
      <Typography variant="h6" sx={{ p: 1 }}>
        {t("cashier.shifts")}
      </Typography>
      <Box sx={{ p: 2 }}>
        <CashierShiftTable cashierId={cashier.id} showCashRegisterColumn />
      </Box>
    </DetailView>
  );
};
