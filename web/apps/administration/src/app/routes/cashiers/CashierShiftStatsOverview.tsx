import { CashierProductStats, useGetCashierShiftStatsQuery } from "@/api";
import { OrderTable } from "@/components/features";
import { useCurrentNode } from "@/hooks";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Tab } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export interface CashierShiftStatsOverview {
  cashierId: number;
  shiftId?: number;
}

export const CashierShiftStatsOverview: React.FC<CashierShiftStatsOverview> = ({ cashierId, shiftId }) => {
  const { currentNode } = useCurrentNode();
  const { data } = useGetCashierShiftStatsQuery({ nodeId: currentNode.id, cashierId, shiftId });
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("products");

  if (!data) {
    return <Loading />;
  }

  const columns: GridColDef<CashierProductStats>[] = [
    {
      field: "product",
      headerName: t("product.name"),
      valueGetter: (val: CashierProductStats["product"]) => val.name,
      flex: 1,
    },
    {
      field: "quantity",
      headerName: t("shift.soldProductQuantity"),
      type: "number",
      width: 150,
    },
  ];

  return (
    <TabContext value={activeTab}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <TabList onChange={(e, val) => setActiveTab(val)}>
          <Tab label={t("shift.bookedProducts")} value="products" />
          <Tab label={t("shift.orders")} value="orders" />
        </TabList>
      </Box>
      <TabPanel value="products">
        <DataGrid
          rows={data.booked_products}
          columns={columns}
          getRowId={(row) => row.product.id}
          disableRowSelectionOnClick
          sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
        />
      </TabPanel>
      <TabPanel value="orders">{activeTab === "orders" && <OrderTable orders={data.orders} />}</TabPanel>
    </TabContext>
  );
};
