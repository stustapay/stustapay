import { DataGrid, GridColDef, DataGridTitle } from "@stustapay/framework";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { LineItem } from "@/api";
import { ProductRoutes } from "@/app/routes";
import { getProductCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TaxRateCell } from "./table/TaxRateCell";

export interface LineItemTableProps {
  lineItems: LineItem[];
}

const ProductCell: React.FC<{ productId: number }> = ({ productId }) => {
  const { currentNode } = useCurrentNode();
  const { data: product } = useLiveQuery(
    (q) =>
      q
        .from({ products: getProductCollection(currentNode.id) })
        .where(({ products }) => eq(products.id, productId))
        .findOne(),
    [currentNode.id]
  );
  if (!product) {
    return "";
  }
  return <RouterLink to={ProductRoutes.detail(productId, currentNode.id)}>{product.name}</RouterLink>;
};

export const LineItemTable: React.FC<LineItemTableProps> = ({ lineItems }) => {
  const { t } = useTranslation();

  const itemColumns: GridColDef<LineItem>[] = [
    {
      field: "product_id",
      headerName: t("item.product"),
      type: "number",
      width: 200,
      renderCell: (params) => <ProductCell productId={params.row.product.id} />,
    },
    {
      field: "quantity",
      headerName: t("item.quantity"),
      type: "number",
      width: 100,
    },
    {
      field: "product_price",
      headerName: t("item.productPrice"),
      type: "currency",
      width: 100,
    },
    {
      field: "total_price",
      headerName: t("item.totalPrice"),
      type: "currency",
      width: 100,
    },
    {
      field: "tax_name",
      headerName: t("item.taxName"),
      width: 100,
    },
    {
      field: "tax_rate",
      headerName: t("item.taxRate"),
      renderCell: (params) => <TaxRateCell taxRateId={params.row.tax_rate_id} />,
      align: "right",
      width: 100,
    },
    {
      field: "total_tax",
      headerName: t("item.totalTax"),
      type: "currency",
      width: 100,
    },
  ];

  return (
    <DataGrid
      autoHeight
      slots={{ toolbar: () => <DataGridTitle title={t("order.lineItems")} /> }}
      rows={lineItems}
      columns={itemColumns}
      disableRowSelectionOnClick
      getRowId={(row) => row.item_id}
      sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
