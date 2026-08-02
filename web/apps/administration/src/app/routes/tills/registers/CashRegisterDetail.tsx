import { Delete as DeleteIcon, Edit as EditIcon, SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Paper, Stack, Tab } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { CashRegistersRoutes, TillRoutes, UserRoutes } from "@/app/routes";
import { ButtonLink, DetailField, DetailLayout, DetailNumberField, DetailView, UserDetailField } from "@/components";
import { TransactionTable } from "@/components/features";
import { getCashRegisterCollection, getTillCollection, getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { CashierShiftTable } from "../../cashiers";

export const CashRegisterDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { registerId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const {
    data: register,
    isLoading: isRegisterLoading,
    isError: isRegisterError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ registers: getCashRegisterCollection(currentNode.id) })
        .where(({ registers }) => eq(registers.id, Number(registerId)))
        .join(
          { tills: getTillCollection(currentNode.id) },
          ({ registers, tills }) => eq(registers.current_till_id, tills.id),
          "left" as const
        )
        .join(
          { users: getUserCollection(currentNode.id) },
          ({ registers, users }) => eq(registers.current_cashier_id, users.id),
          "left" as const
        )
        .select(({ registers, tills, users }) => ({
          ...registers,
          till: tills,
          cashier: users,
        }))
        .findOne(),
    [currentNode.id, registerId]
  );

  const [activeTab, setActiveTab] = React.useState("cashierShifts");

  if (isRegisterError) {
    return <Navigate to={CashRegistersRoutes.list()} />;
  }
  if (isRegisterLoading || !register) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("register.deleteRegister"),
      content: t("register.deleteRegisterDescription"),
      onConfirm: () => {
        getCashRegisterCollection(currentNode.id)
          .delete(Number(registerId))
          .isPersisted.promise.then(() => navigate(CashRegistersRoutes.list()));
      },
    });
  };

  const cashier = register.cashier?.id != null ? register.cashier : null;

  return (
    <Stack spacing={2} direction="column">
      <DetailLayout
        title={register.name}
        routes={CashRegistersRoutes}
        elementNodeId={register.node_id}
        actions={[
          {
            label: t("edit"),
            onClick: () => navigate(CashRegistersRoutes.edit(registerId)),
            color: "primary",
            icon: <EditIcon />,
          },
          {
            label: t("register.transfer"),
            color: "primary",
            icon: <SwapHorizIcon />,
            onClick: () => navigate(`${CashRegistersRoutes.detail(register.id)}/transfer`),
            disabled: register.current_cashier_id == null,
          },
          {
            label: t("delete"),
            onClick: openConfirmDeleteDialog,
            color: "error",
            icon: <DeleteIcon />,
          },
        ]}
      >
        <DetailView>
          <DetailField label={t("register.name")} value={register.name} />
          <DetailNumberField
            label={t("register.currentBalance")}
            value={register.balance}
            type="currency"
            secondaryAction={
              register.balance !== 0 &&
              cashier != null &&
              cashier.id != null && (
                <ButtonLink to={UserRoutes.detailAction(cashier.id, "close-out", cashier.node_id ?? register.node_id)}>
                  {t("cashier.closeOut")}
                </ButtonLink>
              )
            }
          />
          {register.current_cashier_id != null && (
            <UserDetailField label={t("register.currentCashier")} user={cashier} fallbackNodeId={register.node_id} />
          )}
          {register.till != null && (
            <DetailField
              label={t("register.currentTill")}
              linkTo={TillRoutes.detail(register.till.id, register.till.node_id)}
              value={register.till.name}
            />
          )}
        </DetailView>
      </DetailLayout>

      <Paper>
        <TabContext value={activeTab}>
          <TabList onChange={(_, tab) => setActiveTab(tab)} orientation="horizontal">
            <Tab label={t("register.cashierShifts")} value="cashierShifts" />
            <Tab label={t("register.orders")} value="orders" />
          </TabList>
          <TabPanel value="cashierShifts">
            {activeTab === "cashierShifts" && <CashierShiftTable cashRegisterId={register.id} showCashierColumn />}
          </TabPanel>
          <TabPanel value="orders">
            {activeTab === "orders" && (
              <TransactionTable cashRegisterId={register.id} showTillColumn showCashierColumn />
            )}
          </TabPanel>
        </TabContext>
      </Paper>
    </Stack>
  );
};
