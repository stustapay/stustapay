import { Delete as DeleteIcon, Edit as EditIcon, SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Paper, Stack, Tab } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
  CashRegister,
  selectUserById,
  selectCashierShiftAll,
  selectTillById,
  selectTransactionAll,
  useDeleteRegisterMutation,
  useGetCashierShiftsForRegisterQuery,
  useGetCashRegisterAdminQuery,
  useListUsersQuery,
  useListTillsQuery,
  useListTransactionsQuery,
} from "@/api";
import { CashRegistersRoutes, TillRoutes, UserRoutes } from "@/app/routes";
import { ButtonLink, DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { TransactionTable } from "@/components/features";
import { useCurrentNode } from "@/hooks";

import { CashierShiftTable } from "../../cashiers";

const RegisterOrderList: React.FC<{ register: CashRegister }> = ({ register }) => {
  const { transactions } = useListTransactionsQuery(
    { nodeId: register.node_id, registerId: register.id },

    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        transactions: data
          ? selectTransactionAll(data).map((transaction) => {
              const amount =
                transaction.target_account === register.account_id ? transaction.amount : -transaction.amount;
              return Object.assign(transaction, { amount });
            })
          : undefined,
      }),
    }
  );

  if (!transactions) {
    return <Loading />;
  }

  return <TransactionTable transactions={transactions} showTillColumn showCashierColumn />;
};

const CashierShiftsList: React.FC<{ register: CashRegister }> = ({ register }) => {
  const { shifts } = useGetCashierShiftsForRegisterQuery(
    { nodeId: register.node_id, registerId: register.id },

    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        shifts: data ? selectCashierShiftAll(data) : undefined,
      }),
    }
  );

  if (!shifts) {
    return <Loading />;
  }

  return <CashierShiftTable cashierShifts={shifts} showCashierColumn />;
};

export const CashRegisterDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { registerId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const [deleteRegister] = useDeleteRegisterMutation();
  const { data: register, error } = useGetCashRegisterAdminQuery({
    nodeId: currentNode.id,
    registerId: Number(registerId),
  });
  const { data: tills } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });

  const [activeTab, setActiveTab] = React.useState("cashierShifts");

  if (error) {
    return <Navigate to={CashRegistersRoutes.list()} />;
  }
  if (register === undefined || tills === undefined || users === undefined) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("register.deleteRegister"),
      content: t("register.deleteRegisterDescription"),
      onConfirm: () => {
        deleteRegister({ nodeId: currentNode.id, registerId: Number(registerId) }).then(() =>
          navigate(CashRegistersRoutes.list())
        );
      },
    });
  };

  const cashier = register.current_cashier_id != null ? selectUserById(users, register.current_cashier_id) : null;

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
              cashier != null && (
                <ButtonLink to={UserRoutes.detailAction(cashier.id, "close-out", cashier.node_id)}>
                  {t("cashier.closeOut")}
                </ButtonLink>
              )
            }
          />
          {cashier != null && (
            <DetailField
              label={t("register.currentCashier")}
              linkTo={UserRoutes.detail(cashier.id)}
              value={getUserName(cashier)}
            />
          )}
          {register.current_till_id != null && (
            <DetailField
              label={t("register.currentTill")}
              linkTo={TillRoutes.detail(register.current_till_id)}
              value={selectTillById(tills, register.current_till_id)?.name}
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
            {activeTab === "cashierShifts" && <CashierShiftsList register={register} />}
          </TabPanel>
          <TabPanel value="orders">{activeTab === "orders" && <RegisterOrderList register={register} />}</TabPanel>
        </TabContext>
      </Paper>
    </Stack>
  );
};
