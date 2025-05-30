import {
  selectCashierShiftAll,
  selectCashRegisterById,
  selectTerminalById,
  useGetCashierQuery,
  useGetCashierShiftsQuery,
  useListCashRegistersAdminQuery,
  useListTerminalsQuery,
} from "@/api";
import { CashierRoutes, CashRegistersRoutes, TerminalRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { ButtonLink, DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Edit as EditIcon, PointOfSale as PointOfSaleIcon } from "@mui/icons-material";
import { Paper, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { formatUserTagUid, getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CashierShiftTable } from "./CashierShiftTable";

export const CashierDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { cashierId } = useParams();
  const navigate = useNavigate();

  const {
    data: cashier,
    error,
    isLoading,
  } = useGetCashierQuery({ nodeId: currentNode.id, cashierId: Number(cashierId) });
  const {
    cashierShifts,
    error: shiftsError,
    isLoading: isShiftsLoading,
  } = useGetCashierShiftsQuery(
    { nodeId: currentNode.id, cashierId: Number(cashierId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        cashierShifts: data ? selectCashierShiftAll(data) : undefined,
      }),
    }
  );
  const {
    data: terminals,
    isLoading: isTerminalsLoading,
    error: tillError,
  } = useListTerminalsQuery({ nodeId: currentNode.id });
  const {
    data: registers,
    isLoading: isRegistersLoading,
    error: registerError,
  } = useListCashRegistersAdminQuery({ nodeId: currentNode.id });

  if (error || tillError || shiftsError || registerError) {
    navigate(-1);
    toast.error("Error while loading cashier");
    return null;
  }

  if (
    !cashier ||
    !cashierShifts ||
    !registers ||
    isLoading ||
    isTerminalsLoading ||
    isShiftsLoading ||
    isRegistersLoading
  ) {
    return <Loading />;
  }

  const getTerminal = (id: number) => {
    if (!terminals) {
      return undefined;
    }
    return selectTerminalById(terminals, id);
  };

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
    <DetailLayout
      title={getUserName(cashier)}
      routes={CashierRoutes}
      actions={[
        {
          label: t("cashier.closeOut"),
          hidden: cashier.cash_drawer_balance === 0,
          onClick: () => navigate(CashierRoutes.detailAction(cashier.id, "close-out")),
          icon: <PointOfSaleIcon />,
        },
        {
          label: t("edit"),
          onClick: () => navigate(UserRoutes.edit(cashier.id, cashier.node_id)),
          color: "primary",
          icon: <EditIcon />,
        },
      ]}
    >
      <DetailView>
        <DetailField label={t("cashier.login")} value={cashier.login} />
        <DetailField label={t("cashier.name")} value={cashier.display_name} />
        <DetailField label={t("cashier.description")} value={cashier.description} />
        <DetailField
          label={t("cashier.tagId")}
          value={formatUserTagUid(cashier.user_tag_uid_hex)}
          linkTo={UserTagRoutes.detail(cashier.user_tag_id)}
        />
        {cashier.terminal_ids.length !== 0 ? (
          cashier.terminal_ids.map((id) => (
            <DetailField
              key={id}
              label={t("cashier.terminal")}
              value={getTerminal(id)?.name}
              linkTo={TerminalRoutes.detail(getTerminal(id)?.id)}
            />
          ))
        ) : (
          <DetailField label={t("cashier.terminal")} value={t("cashier.notLoggedInAtTill")} />
        )}
        <DetailNumberField
          label={t("cashier.cashDrawerBalance")}
          type="currency"
          value={cashier.cash_drawer_balance}
          secondaryAction={
            cashier.cash_drawer_balance !== 0 && (
              <ButtonLink to={CashierRoutes.detailAction(cashierId, "close-out")}>{t("cashier.closeOut")}</ButtonLink>
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
      </DetailView>
      <Paper sx={{ p: 1 }}>
        <Typography variant="body1" sx={{ p: 1 }}>
          {t("cashier.shifts")}
        </Typography>
        <CashierShiftTable cashierShifts={cashierShifts} showCashRegisterColumn />
      </Paper>
    </DetailLayout>
  );
};
