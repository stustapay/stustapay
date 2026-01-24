import * as React from "react";
import { Link } from "react-router-dom";
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
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from "@mui/icons-material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Order, LineItem, LineItemRead, Product, useListTillsQuery, selectTillById, useListOrdersFilteredQuery } from "@/api";
import { useTranslation } from "react-i18next";
import { TableFilterBar, ColumnFilterConfig } from "@/components/tables/TableFilterBar";
import { SortableTableHeader } from "@/components/tables/SortableTableHeader";
import { useFilterableTable } from "@/hooks/useFilterableTable";

export type OrdersTableProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
  productId?: number;
};

type TableRowData = {
  order: Order;
  lineItem: { product: Product; quantity: number; product_price: number; total_price: number };
  orderDate: number; // timestamp for sorting
  orderId: number;
  orderType: string;
  tillName: string;
  productName: string;
  total: number;
};

const INITIAL_DISPLAY_LIMIT = 50;

export const OrdersTable: React.FC<OrdersTableProps> = ({ fromTimestamp, toTimestamp, tillId, productId }) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showAll, setShowAll] = React.useState(false);
  const { data: tills } = useListTillsQuery({ nodeId: currentNode.id });

  const { data: ordersData, isLoading } = useListOrdersFilteredQuery({
    nodeId: currentNode.id,
    fromTimestamp: fromTimestamp?.toISO() ?? undefined,
    toTimestamp: toTimestamp?.toISO() ?? undefined,
    tillId: tillId,
  });

  const orders = React.useMemo(() => {
    if (!ordersData) return undefined;
    return ordersData.ids.map((id) => ordersData.entities[id]);
  }, [ordersData]);

  // Flatten orders with line items for table display
  const tableRowsData = React.useMemo((): TableRowData[] => {
    if (!orders) return [];
    const rows: TableRowData[] = [];
    orders.forEach((order: Order) => {
      if (order.line_items && order.line_items.length > 0) {
        order.line_items.forEach((lineItem: LineItem) => {
          // Filter by productId if specified
          if (productId !== undefined && lineItem.product.id !== productId) {
            return;
          }
          const totalPrice = lineItem.product_price * lineItem.quantity;
          rows.push({
            order,
            lineItem: {
              product: lineItem.product,
              quantity: lineItem.quantity,
              product_price: lineItem.product_price,
              total_price: totalPrice,
            },
            orderDate: DateTime.fromISO(order.booked_at).toMillis(),
            orderId: order.id,
            orderType: order.order_type,
            tillName: (tills && order.till_id ? selectTillById(tills, order.till_id)?.name : "") ?? "-",
            productName: lineItem.product.name,
            total: totalPrice,
          });
        });
      } else if (productId === undefined) {
        // Only show orders without line items when no product filter is applied
        rows.push({
          order,
          lineItem: {
            product: {
              id: 0,
              name: "-",
              price: 0,
              fixed_price: true,
              is_locked: false,
              is_returnable: false,
              tax_rate_id: 0,
              tax_name: "",
              tax_rate: 0,
              restrictions: [],
              node_id: 0,
              type: "user_defined",
            } as Product,
            quantity: 0,
            product_price: 0,
            total_price: order.total_price,
          },
          orderDate: DateTime.fromISO(order.booked_at).toMillis(),
          orderId: order.id,
          orderType: order.order_type,
          tillName: (tills && order.till_id ? selectTillById(tills, order.till_id)?.name : "") ?? "-",
          productName: "-",
          total: order.total_price,
        });
      }
    });
    return rows;
  }, [orders, tills, productId]);

  // Get unique order types for filters
  const orderTypes = React.useMemo(() => {
    const types = new Set<string>();
    tableRowsData.forEach((row) => {
      if (row.orderType) types.add(row.orderType);
    });
    return Array.from(types).sort();
  }, [tableRowsData]);

  const columnFilters: ColumnFilterConfig[] = React.useMemo(
    () => [
      {
        field: "orderType",
        label: t("overview.orderType"),
        type: "select",
        options: [
          { value: "", label: t("overview.all") },
          ...orderTypes.map((type) => ({ value: type, label: type })),
        ],
      },
    ],
    [orderTypes, t]
  );

  const {
    filteredData,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    setSort,
    columnFilters: activeColumnFilters,
    setColumnFilter,
    clearColumnFilter,
    clearAllFilters,
  } = useFilterableTable({
    data: tableRowsData,
    searchFields: ["orderId", "productName", "tillName", "orderType"],
    defaultSort: { field: "orderDate", direction: "desc" },
  });

  // Limit displayed data to INITIAL_DISPLAY_LIMIT unless showAll is true
  const displayedData = React.useMemo(() => {
    if (showAll) return filteredData;
    return filteredData.slice(0, INITIAL_DISPLAY_LIMIT);
  }, [filteredData, showAll]);

  const hasMoreData = filteredData.length > INITIAL_DISPLAY_LIMIT;
  const remainingCount = filteredData.length - INITIAL_DISPLAY_LIMIT;

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
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
            Bestellungen
          </Typography>
          <Skeleton variant="rounded" height={isSmallMobile ? 250 : isMobile ? 300 : 400} />
        </CardContent>
      </Card>
    );
  }

  if (!orders) {
    return (
      <Card
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
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
            {t("overview.orders")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {t("overview.noDataAvailable")}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
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
            Bestellungen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            No orders found for the selected filters
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
        border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
        boxShadow: "none",
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack spacing={2}>
          <Typography
            variant="h6"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "text.secondary",
            }}
          >
            {t("overview.orders")}
          </Typography>

          <TableFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("overview.searchOrders")}
            columnFilters={columnFilters}
            activeColumnFilters={activeColumnFilters}
            onColumnFilterChange={setColumnFilter}
            onClearColumnFilter={clearColumnFilter}
            onClearAll={clearAllFilters}
          />

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
                  minWidth: 800,
                  "& .MuiTableCell-root": {
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    fontSize: { xs: "0.65rem", sm: "0.7rem", md: "0.875rem" },
                    py: { xs: 0.4, sm: 0.5, md: 1 },
                    px: { xs: 0.5, sm: 0.75, md: 1.5 },
                    whiteSpace: "nowrap",
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
                    field="orderDate"
                    label={t("overview.date")}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                  />
                  <SortableTableHeader
                    field="orderId"
                    label={t("overview.orderNumber")}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                  />
                  <SortableTableHeader
                    field="orderType"
                    label={t("overview.orderType")}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                  />
                  <SortableTableHeader
                    field="tillName"
                    label={t("common.till")}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                  />
                  <TableCell
                    sx={{
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "text.secondary",
                    }}
                  >
                    {t("item.product")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "text.secondary",
                    }}
                  >
                    {t("item.quantity")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "text.secondary",
                    }}
                  >
                    {t("item.productPrice")}
                  </TableCell>
                  <SortableTableHeader
                    field="total"
                    label={t("overview.total")}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => setSort(field)}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{
                        py: { xs: 2, sm: 3 },
                        color: "text.secondary",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      {t("overview.noOrdersMatchFilter")}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedData.map((row, idx) => (
                    <TableRow key={`${row.order.id}-${idx}`}>
                      <TableCell>
                        {isSmallMobile
                          ? DateTime.fromISO(row.order.booked_at).toFormat("MM-dd HH:mm")
                          : isMobile
                            ? DateTime.fromISO(row.order.booked_at).toFormat("MM-dd HH:mm")
                            : DateTime.fromISO(row.order.booked_at).toFormat("yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/node/${currentNode.id}/orders/${row.order.id}`}
                          style={{
                            color: "#73BF69",
                            textDecoration: "none",
                            transition: "color 0.2s ease-in-out",
                            fontSize: "inherit",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = "none";
                          }}
                        >
                          {row.order.id}
                        </Link>
                      </TableCell>
                      <TableCell>{row.order.order_type}</TableCell>
                      <TableCell>{row.tillName}</TableCell>
                      <TableCell>{row.lineItem.product.name}</TableCell>
                      <TableCell align="right">{row.lineItem.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(row.lineItem.product_price)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: "#73BF69",
                          fontWeight: 500,
                          transition: "color 0.2s ease-in-out",
                        }}
                      >
                        {formatCurrency(row.lineItem.total_price)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

          {hasMoreData && (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowAll(!showAll)}
                endIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{
                  color: "#73BF69",
                  textTransform: "none",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  "&:hover": {
                    backgroundColor: "rgba(115, 191, 105, 0.1)",
                  },
                }}
              >
                {showAll
                  ? t("overview.showLess")
                  : t("overview.showMore", { count: remainingCount })}
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
