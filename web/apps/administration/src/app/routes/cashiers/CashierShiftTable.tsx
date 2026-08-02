import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { ArrayElement } from "@stustapay/utils";
import { eq, materialize, useLiveQuery } from "@tanstack/react-db";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { CashRegistersRoutes, UserRoutes } from "@/app/routes";
import { UserCell, userValueGetter } from "@/components/table/UserCell";
import { getCashRegisterCollection, getCashierShiftCollection, getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

const shiftDetailPath = (cashierId: number, shiftId: number) => `${UserRoutes.detail(cashierId)}/shifts/${shiftId}`;

export const CashierShiftTable: React.FC<{
  cashierId?: number;
  cashRegisterId?: number;
  showCashierColumn?: boolean;
  showCashRegisterColumn?: boolean;
  hideWhenEmpty?: boolean;
}> = ({
  cashierId,
  cashRegisterId,
  showCashierColumn = false,
  showCashRegisterColumn = false,
  hideWhenEmpty = false,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const {
    data: rows,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) => {
      let query = q.from({ shifts: getCashierShiftCollection(currentNode.id) });
      if (cashierId != null) {
        query = query.where(({ shifts }) => eq(shifts.cashier_id, cashierId));
      }
      if (cashRegisterId != null) {
        query = query.where(({ shifts }) => eq(shifts.cash_register_id, cashRegisterId));
      }
      return query.select(({ shifts: shiftRow }) => ({
        ...shiftRow,
        closingOutUser: materialize(
          q
            .from({ users: getUserCollection(currentNode.id) })
            .where(({ users }) => eq(users.id, shiftRow.closing_out_user_id))
            .select(({ users }) => users)
        ),
        cashier: materialize(
          q
            .from({ users: getUserCollection(currentNode.id) })
            .where(({ users }) => eq(users.id, shiftRow.cashier_id))
            .select(({ users }) => users)
        ),
        register: materialize(
          q
            .from({ registers: getCashRegisterCollection(currentNode.id) })
            .where(({ registers }) =>
              shiftRow.cash_register_id != null ? eq(registers.id, shiftRow.cash_register_id) : eq(registers.id, -1)
            )
            .select(({ registers }) => registers)
        ),
      }));
    },
    [currentNode.id, cashierId, cashRegisterId]
  );

  if (isError || (hideWhenEmpty && !isLoading && (rows?.length ?? 0) === 0)) {
    return null;
  }

  type CashierShiftRow = ArrayElement<NonNullable<typeof rows>>;

  const columns: GridColDef<CashierShiftRow>[] = [
    {
      field: "id",
      headerName: t("shift.id"),
      renderCell: (params) => (
        <RouterLink to={shiftDetailPath(params.row.cashier_id, params.row.id)}>{params.row.id}</RouterLink>
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
            valueGetter: (_, row) => userValueGetter(row.cashier[0]),
            renderCell: ({ row }) => <UserCell user={row.cashier[0]} nodeId={currentNode.id} />,
            width: 200,
          },
        ] satisfies GridColDef<CashierShiftRow>[])
      : []),
    {
      field: "closing_out_user_id",
      headerName: t("closeOut.closingOutUser"),
      type: "string",
      valueGetter: (_, row) => userValueGetter(row.closingOutUser[0]),
      renderCell: ({ row }) => <UserCell user={row.closingOutUser[0]} nodeId={currentNode.id} />,
      width: 200,
    },
    ...(showCashRegisterColumn
      ? ([
          {
            field: "cash_register_id",
            headerName: t("shift.cashRegister"),
            type: "string",
            valueGetter: (_, row) => row.register[0]?.name ?? "",
            renderCell: ({ row }) => {
              const register = row.register[0];
              if (register == null) {
                return null;
              }

              return (
                <Link component={RouterLink} to={CashRegistersRoutes.detail(register.id, register.node_id)}>
                  {register.name}
                </Link>
              );
            },
            width: 200,
          },
        ] satisfies GridColDef<CashierShiftRow>[])
      : []),
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

  return (
    <DataGrid
      loading={isLoading}
      rows={rows ?? []}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ border: "none" }}
    />
  );
};
