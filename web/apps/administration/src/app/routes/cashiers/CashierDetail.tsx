import {
  selectCashierShiftAll,
  selectTillById,
  selectTillRegisterById,
  selectUserById,
  useGetCashierQuery,
  useGetCashierShiftsQuery,
  useListCashRegistersAdminQuery,
  useListTillsQuery,
  useListUsersQuery,
} from "@/api";
import { CashierRoutes, TillRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { ButtonLink, DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Edit as EditIcon, PointOfSale as PointOfSaleIcon } from "@mui/icons-material";
import { Paper, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { CashierShift, formatUserTagUid, getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

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
  const { data: tills, isLoading: isTillsLoading, error: tillError } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: users, isLoading: isUsersLoading, error: userError } = useListUsersQuery({ nodeId: currentNode.id });
  const {
    data: registers,
    isLoading: isRegistersLoading,
    error: registerError,
  } = useListCashRegistersAdminQuery({ nodeId: currentNode.id });

  if (error || tillError || shiftsError || userError || registerError) {
    navigate(-1);
    toast.error("Error while loading cashier");
    return null;
  }

  if (
    !cashier ||
    !cashierShifts ||
    !registers ||
    isLoading ||
    isTillsLoading ||
    isShiftsLoading ||
    isUsersLoading ||
    isRegistersLoading
  ) {
    return <Loading />;
  }

  const getTill = (id: number) => {
    if (!tills) {
      return undefined;
    }
    return selectTillById(tills, id);
  };

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

  const renderRegister = (id?: number | null) => {
    if (id == null) {
      return "";
    }

    const register = selectTillRegisterById(registers, id);
    if (!register) {
      return "";
    }

    return register.name;
  };

  const columns: GridColDef<CashierShift>[] = [
    {
      field: "id",
      headerName: t("shift.id") as string,
      renderCell: (params) => (
        <RouterLink to={CashierRoutes.detail(cashierId) + `/shifts/${params.row.id}`}>{params.row.id}</RouterLink>
      ),
    },
    {
      field: "comment",
      headerName: t("shift.comment") as string,
      flex: 2,
    },
    {
      field: "closing_out_user_id",
      headerName: t("closeOut.closingOutUser") as string,
      type: "string",
      renderCell: (params) => renderUser(params.row.closing_out_user_id),
      width: 200,
    },
    {
      field: "started_at",
      headerName: t("shift.startedAt") as string,
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      flex: 1,
    },
    {
      field: "ended_at",
      headerName: t("shift.endedAt") as string,
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      flex: 1,
    },
    {
      field: "actual_cash_drawer_balance",
      headerName: t("shift.actualCashDrawerBalance") as string,
      type: "currency",
    },
    {
      field: "expected_cash_drawer_balance",
      headerName: t("shift.expectedCashDrawerBalance") as string,
      type: "currency",
    },
    {
      field: "cash_drawer_imbalance",
      headerName: t("shift.cashDrawerImbalance") as string,
      type: "currency",
    },
  ];

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
        {cashier.till_ids.length !== 0 ? (
          cashier.till_ids.map((till_id) => (
            <DetailField
              key={till_id}
              label={t("cashier.till")}
              value={getTill(till_id)?.name}
              linkTo={TillRoutes.detail(getTill(till_id)?.id)}
            />
          ))
        ) : (
          <DetailField label={t("cashier.till")} value={t("cashier.notLoggedInAtTill")} />
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
          <DetailField label={t("cashier.cashRegister")} value={renderRegister(cashier.cash_register_id)} />
        )}
      </DetailView>
      <Paper sx={{ p: 1 }}>
        <Typography variant="body1" sx={{ p: 1 }}>
          {t("cashier.shifts")}
        </Typography>
        <DataGrid
          autoHeight
          rows={cashierShifts}
          columns={columns}
          disableRowSelectionOnClick
          sx={{ border: "none" }}
        />
      </Paper>
    </DetailLayout>
  );
};
