import { LineItem, selectProductById, selectTaxRateById, useListProductsQuery, useListTaxRatesQuery } from "@/api";
import { ProductRoutes } from "@/app/routes";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Tooltip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DataGridTitle, Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface LineItemTableProps {
  lineItems: LineItem[];
}

export const LineItemTable: React.FC<LineItemTableProps> = ({ lineItems }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const formatCurrency = useCurrencyFormatter();

  const { data: products, isLoading: isProductsLoading } = useListProductsQuery({ nodeId: currentNode.id });
  const { data: taxRates, isLoading: isTaxRatesLoading } = useListTaxRatesQuery({ nodeId: currentNode.id });

  if (isProductsLoading || isTaxRatesLoading) {
    return <Loading />;
  }

  const renderProduct = (productId: number | null) => {
    if (productId == null || !products) {
      return "";
    }
    const product = selectProductById(products, productId);
    if (!product) {
      return "";
    }

    return <RouterLink to={ProductRoutes.detail(product.id)}>{product.name}</RouterLink>;
  };

  const renderTaxRate = (id: number, rate: number) => {
    if (!taxRates) {
      return "";
    }

    const tax = selectTaxRateById(taxRates, id);
    if (!tax) {
      return "";
    }

    return (
      <Tooltip title={tax.description}>
        <span>{(rate * 100).toFixed(0)} %</span>
      </Tooltip>
    );
  };

  const itemColumns: GridColDef<LineItem>[] = [
    {
      field: "product_id",
      headerName: t("item.product") as string,
      type: "number",
      width: 200,
      renderCell: (params) => renderProduct(params.row.product.id),
    },
    {
      field: "quantity",
      headerName: t("item.quantity") as string,
      type: "number",
      width: 100,
    },
    {
      field: "product_price",
      headerName: t("item.productPrice") as string,
      valueFormatter: (value) => formatCurrency(value),
      width: 100,
    },
    {
      field: "total_price",
      headerName: t("item.totalPrice") as string,
      valueFormatter: (value) => formatCurrency(value),
      width: 100,
    },
    {
      field: "tax_name",
      headerName: t("item.taxName") as string,
      width: 100,
    },
    {
      field: "tax_rate",
      headerName: t("item.taxRate") as string,
      renderCell: (params) => renderTaxRate(params.row.tax_rate_id, params.row.tax_rate),
      align: "right",
      width: 100,
    },
    {
      field: "total_tax",
      headerName: t("item.totalTax") as string,
      valueFormatter: (value) => formatCurrency(value),
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
