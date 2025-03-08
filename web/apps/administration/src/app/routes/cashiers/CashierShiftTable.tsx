import {
  CashierShift,
  selectCashRegisterById,
  selectUserById,
  useGetCashRegisterAdminQuery,
  useListCashRegistersAdminQuery,
  useListUsersQuery,
} from "@/api";
import { CashierRoutes, CashRegistersRoutes, UserRoutes } from "@/app/routes";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const CashierShiftTable: React.FC<{
  cashierShifts: CashierShift[];
  showCashierColumn?: boolean;
  showCashRegisterColumn?: boolean;
}> = ({ cashierShifts, showCashierColumn = false, showCashRegisterColumn = false }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });
  const { data: registers } = useListCashRegistersAdminQuery({ nodeId: currentNode.id });

  if (!users || !registers) {
    return <Loading />;
  }

  const getUsernameForUser = (id?: number | null) => {
    if (id == null || users == null) {
      return "";
    }

    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  const columns: GridColDef<CashierShift>[] = [
    {
      field: "id",
      headerName: t("shift.id"),
      renderCell: (params) => (
        <RouterLink to={CashierRoutes.detail(params.row.cashier_id) + `/shifts/${params.row.id}`}>
          {params.row.id}
        </RouterLink>
      ),
    },
    {
      field: "comment",
      headerName: t("shift.comment"),
      flex: 2,
    },
    ...(showCashierColumn
      ? ([
          {
            field: "cashier_id",
            headerName: t("common.cashier"),
            type: "string",
            renderCell: (params: any) => (
              <RouterLink to={CashierRoutes.detail(params.row.cashier_id)}>
                {getUsernameForUser(params.row.cashier_id)}
              </RouterLink>
            ),
            width: 200,
          },
        ] as const)
      : ([] as const)),
    {
      field: "closing_out_user_id",
      headerName: t("closeOut.closingOutUser"),
      type: "string",
      renderCell: (params) => (
        <RouterLink to={UserRoutes.detail(params.row.closing_out_user_id)}>
          {getUsernameForUser(params.row.closing_out_user_id)}
        </RouterLink>
      ),
      width: 200,
    },
    ...(showCashRegisterColumn
      ? ([
          {
            field: "cash_register_id",
            headerName: t("shift.cashRegister"),
            type: "string",
            renderCell: (params: any) => (
              <RouterLink to={CashRegistersRoutes.detail(params.row.cash_register_id)}>
                {selectCashRegisterById(registers, params.row.cash_register_id)?.name}
              </RouterLink>
            ),
            width: 200,
          },
        ] as const)
      : ([] as const)),
    {
      field: "started_at",
      headerName: t("shift.startedAt"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      flex: 1,
    },
    {
      field: "ended_at",
      headerName: t("shift.endedAt"),
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      flex: 1,
    },
    {
      field: "actual_cash_drawer_balance",
      headerName: t("shift.actualCashDrawerBalance"),
      type: "currency",
    },
    {
      field: "expected_cash_drawer_balance",
      headerName: t("shift.expectedCashDrawerBalance"),
      type: "currency",
    },
    {
      field: "cash_drawer_imbalance",
      headerName: t("shift.cashDrawerImbalance"),
      type: "currency",
    },
  ];

  return <DataGrid rows={cashierShifts} columns={columns} disableRowSelectionOnClick sx={{ border: "none" }} />;
};
