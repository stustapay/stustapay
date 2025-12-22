import { SumUpTransaction, useListSumupTransactionsQuery } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { ProductRoutes, SumUpTransactionRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Button, Link, Stack } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { Privilege } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const SumUpTransactionList: React.FC = withPrivilegeGuard(Privilege.node_administration, () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const pageSize = 200;
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [rows, setRows] = React.useState<SumUpTransaction[]>([]);
  const [hasMore, setHasMore] = React.useState(true);

  const { data: transactions, isFetching } = useListSumupTransactionsQuery({
    nodeId: currentNode.id,
    limit: pageSize,
    newestTime: cursor,
  });

  React.useEffect(() => {
    setCursor(undefined);
    setRows([]);
    setHasMore(true);
  }, [currentNode.id]);

  React.useEffect(() => {
    if (!transactions) {
      return;
    }

    setRows((previous) => {
      if (!cursor) {
        return transactions;
      }
      const existing = new Set(previous.map((row) => row.id));
      const unique = transactions.filter((row) => !existing.has(row.id));
      return [...previous, ...unique];
    });
    setHasMore(transactions.length === pageSize);
  }, [cursor, pageSize, transactions]);

  const handleLoadMore = () => {
    const lastRow = rows[rows.length - 1];
    if (!lastRow) {
      return;
    }
    setCursor(lastRow.timestamp);
  };

  const columns: GridColDef<SumUpTransaction>[] = [
    {
      field: "id",
      headerName: t("common.id"),
      width: 300,
      renderCell: (params) => (
        <Link component={RouterLink} to={SumUpTransactionRoutes.detail(params.row.transaction_code)}>
          {params.row.id}
        </Link>
      ),
    },
    {
      field: "amount",
      headerName: t("sumup.checkout.amount"),
      type: "number",
      valueFormatter: (amount: number, row) => `${amount.toFixed(2)} ${row.currency}`,
    },
    { field: "payment_type", headerName: t("sumup.checkout.payment_type") },
    { field: "timestamp", headerName: t("sumup.checkout.date"), width: 200 },
    { field: "status", headerName: t("sumup.checkout.status") },
    { field: "product_summary", headerName: t("sumup.transaction.product_summary"), flex: 1 },
  ];

  return (
    <ListLayout title={t("sumup.transactions")} routes={ProductRoutes}>
      <Stack spacing={2}>
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          loading={isFetching}
          initialState={{
            sorting: {
              sortModel: [{ field: "timestamp", sort: "desc" }],
            },
          }}
          sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
        />
        <Button variant="outlined" onClick={handleLoadMore} disabled={!hasMore || isFetching || rows.length === 0}>
          {t("common.loadMore")}
        </Button>
      </Stack>
    </ListLayout>
  );
});
