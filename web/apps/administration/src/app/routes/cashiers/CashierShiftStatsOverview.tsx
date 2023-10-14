import { CashierShiftStats, useGetCashierShiftStatsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export interface CashierShiftStatsOverview {
  cashierId: number;
  shiftId?: number;
}

type ArrElement<ArrType> = ArrType extends readonly (infer ElementType)[] ? ElementType : never;

export const CashierShiftStatsOverview: React.FC<CashierShiftStatsOverview> = ({ cashierId, shiftId }) => {
  const { currentNode } = useCurrentNode();
  const { data } = useGetCashierShiftStatsQuery({ nodeId: currentNode.id, cashierId, shiftId });
  const { t } = useTranslation();

  if (!data) {
    return <Loading />;
  }

  const columns: GridColDef<ArrElement<CashierShiftStats["booked_products"]>>[] = [
    {
      field: "product.name",
      headerName: t("product.name") as string,
      flex: 1,
      valueGetter: (params) => params.row.product.name,
    },
    {
      field: "quantity",
      headerName: t("shift.soldProductQuantity") as string,
      type: "number",
      width: 150,
    },
  ];

  return (
    <DataGrid
      autoHeight
      rows={data.booked_products}
      columns={columns}
      getRowId={(row) => row.product.id}
      disableRowSelectionOnClick
      sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
