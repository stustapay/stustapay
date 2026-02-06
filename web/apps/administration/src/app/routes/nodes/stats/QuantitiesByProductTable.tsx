import * as React from "react";
import { DateTime } from "luxon";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
  Stack,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { useGetProductStatsQuery } from "@/api";
import { useTranslation } from "react-i18next";
import { SortableTableHeader } from "@/components/tables/SortableTableHeader";
import { useFilterableTable } from "@/hooks/useFilterableTable";

export type QuantitiesByProductTableProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
  productId?: number;
  pollingIntervalMs?: number;
};

type ProductRow = {
  productId: number;
  productName: string;
  quantity: number;
  revenue: number;
};

export const QuantitiesByProductTable: React.FC<QuantitiesByProductTableProps> = ({
  fromTimestamp,
  toTimestamp,
  tillId,
  productId,
  pollingIntervalMs = 0,
}) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, isLoading } = useGetProductStatsQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      tillId: tillId,
    },
    { pollingInterval: pollingIntervalMs }
  );

  // Combine product data
  const tableData: ProductRow[] = React.useMemo(() => {
    if (!data) return [];

    // Combine product and deposit stats
    let allProducts = [...(data.product_overall_stats || []), ...(data.deposit_overall_stats || [])];

    // Filter by productId if specified
    if (productId !== undefined) {
      allProducts = allProducts.filter((product) => product.product_id === productId);
    }

    return allProducts.map((product) => ({
      productId: product.product_id,
      productName: product.product_name,
      quantity: product.count,
      revenue: product.revenue,
    }));
  }, [data, productId]);

  const {
    filteredData,
    sortField,
    sortDirection,
    setSort,
  } = useFilterableTable({
    data: tableData,
    searchFields: ["productName"],
    defaultSort: { field: "quantity", direction: "desc" },
  });

  // Calculate totals
  const totals = React.useMemo(() => {
    return filteredData.reduce(
      (acc, row) => ({
        quantity: acc.quantity + row.quantity,
        revenue: acc.revenue + row.revenue,
      }),
      { quantity: 0, revenue: 0 }
    );
  }, [filteredData]);

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (theme) =>
            `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.875rem" },
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: { xs: "0.2px", sm: "0.3px", md: "0.5px" },
              mb: { xs: 1, sm: 1.5, md: 2 },
              color: "text.secondary",
            }}
          >
            {t("overview.quantitiesPerProduct")}
          </Typography>
          <Skeleton variant="rounded" height={isSmallMobile ? 200 : isMobile ? 250 : 300} />
        </CardContent>
      </Card>
    );
  }

  if (!data || tableData.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (theme) =>
            `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: { xs: "0.3px", sm: "0.5px" },
              mb: { xs: 1.5, sm: 2 },
              color: "text.secondary",
            }}
          >
            {t("overview.quantitiesPerProduct")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {t("overview.noDataAvailable")}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
        border: (theme) =>
          `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
        boxShadow: "none",
      }}
    >
      <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
        <Stack spacing={{ xs: 1, sm: 1.5, md: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.875rem" },
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: { xs: "0.2px", sm: "0.3px", md: "0.5px" },
              color: "text.secondary",
            }}
          >
            {t("overview.quantitiesPerProduct")}
          </Typography>

          <Box
            sx={{
              width: "100%",
              overflowX: "auto",
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#73BF69",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#5a9a4f",
                },
              },
            }}
          >
            <TableContainer>
              <Table
                size="small"
                sx={{
                  minWidth: 400,
                  "& .MuiTableCell-root": {
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.875rem" },
                    py: { xs: 0.5, sm: 0.75, md: 1 },
                    px: { xs: 0.75, sm: 1, md: 1.5 },
                  },
                  "& .MuiTableRow-root": {
                    transition: "background-color 0.2s ease-in-out",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <SortableTableHeader
                      field="productName"
                      label={t("item.product")}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={(field) => setSort(field)}
                    />
                    <SortableTableHeader
                      field="quantity"
                      label={t("item.quantity")}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={(field) => setSort(field)}
                      align="right"
                    />
                    <SortableTableHeader
                      field="revenue"
                      label={t("overview.revenue")}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={(field) => setSort(field)}
                      align="right"
                    />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 500,
                          color: row.quantity < 0 ? "error.main" : "inherit",
                        }}
                      >
                        {row.quantity}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: row.revenue < 0 ? "error.main" : "#73BF69",
                          fontWeight: 500,
                        }}
                      >
                        {formatCurrency(row.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow
                    sx={{
                      "& .MuiTableCell-root": {
                        borderTop: "2px solid rgba(255, 255, 255, 0.2)",
                        fontWeight: 700,
                      },
                    }}
                  >
                    <TableCell sx={{ textTransform: "uppercase" }}>{t("overview.total")}</TableCell>
                    <TableCell align="right">{totals.quantity}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: totals.revenue < 0 ? "error.main" : "#73BF69",
                      }}
                    >
                      {formatCurrency(totals.revenue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
