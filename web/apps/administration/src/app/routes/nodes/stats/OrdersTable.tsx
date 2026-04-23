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
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { useCurrencyFormatter, useCurrentNode, useCurrentUserHasPrivilege } from "@/hooks";
import { Order, LineItem, Product, useListTillsQuery, selectTillById, useListOrdersFilteredQuery } from "@/api";
import { OrderRoutes } from "@/app/routes";
import { useTranslation } from "react-i18next";
import { TableFilterBar, ColumnFilterConfig } from "@/components/tables/TableFilterBar";
import { SortableTableHeader } from "@/components/tables/SortableTableHeader";
import { useFilterableTable } from "@/hooks/useFilterableTable";
import { statsQueryOptions } from "./queryOptions";

export type OrdersTableProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  selectedDates?: string[];
  tillId?: number;
  subnodeId?: number;
  productId?: number;
  pollingIntervalMs?: number;
  enabled?: boolean;
};

type TableRowData = {
  order: Order;
  lineItem: { product: Product; quantity: number; product_price: number; total_price: number };
  orderDate: number;
  orderId: number;
  orderType: string;
  tillName: string;
  productName: string;
  quantity: number;
  productPrice: number;
  total: number;
};

const PAGE_SIZE = 50;

export const OrdersTable: React.FC<OrdersTableProps> = ({
  fromTimestamp,
  toTimestamp,
  selectedDates,
  tillId,
  subnodeId,
  productId,
  pollingIntervalMs = 0,
  enabled = true,
}) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const canViewOrderLinks = useCurrentUserHasPrivilege(OrderRoutes.privilege);
  const effectiveNodeId = subnodeId ?? currentNode.id;
  const queryKey = React.useMemo(
    () =>
      JSON.stringify({
        nodeId: currentNode.id,
        fromTimestamp: fromTimestamp?.toISO() ?? null,
        toTimestamp: toTimestamp?.toISO() ?? null,
        selectedDates: selectedDates ?? null,
        tillId: tillId ?? null,
        subnodeId: subnodeId ?? null,
      }),
    [currentNode.id, fromTimestamp, selectedDates, subnodeId, tillId, toTimestamp]
  );
  const [currentOffset, setCurrentOffset] = React.useState(0);
  const [pendingAppendOffset, setPendingAppendOffset] = React.useState<number | null>(null);
  const [loadedOrders, setLoadedOrders] = React.useState<Order[] | undefined>(undefined);
  const [hasMoreOrders, setHasMoreOrders] = React.useState(false);
  const previousQueryKeyRef = React.useRef(queryKey);
  const lastIntegratedPageKeyRef = React.useRef<string | null>(null);

  const { data: tills } = useListTillsQuery({ nodeId: effectiveNodeId }, statsQueryOptions(pollingIntervalMs));
  const {
    data: ordersData,
    isLoading,
    fulfilledTimeStamp,
  } = useListOrdersFilteredQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      selectedDates,
      tillId,
      subnodeId,
      limit: PAGE_SIZE,
      offset: currentOffset,
    },
    {
      ...statsQueryOptions(pollingIntervalMs, enabled),
      skip: !canViewOrderLinks || !enabled,
    }
  );

  const currentPageOrders = React.useMemo(() => {
    if (!ordersData) {
      return undefined;
    }

    return ordersData.ids.map((id) => ordersData.entities[id]).filter((order): order is Order => order != null);
  }, [ordersData]);

  React.useEffect(() => {
    if (previousQueryKeyRef.current === queryKey) {
      return;
    }

    previousQueryKeyRef.current = queryKey;
    lastIntegratedPageKeyRef.current = null;
    setCurrentOffset(0);
    setPendingAppendOffset(null);
    setLoadedOrders(undefined);
    setHasMoreOrders(false);
  }, [queryKey]);

  React.useEffect(() => {
    if (!currentPageOrders) {
      return;
    }

    const currentPageKey = `${queryKey}|${currentOffset}|${fulfilledTimeStamp ?? 0}`;
    if (lastIntegratedPageKeyRef.current === currentPageKey) {
      return;
    }

    if (currentOffset === 0) {
      setLoadedOrders(currentPageOrders);
      setHasMoreOrders(currentPageOrders.length === PAGE_SIZE);
      setPendingAppendOffset(null);
      lastIntegratedPageKeyRef.current = currentPageKey;
      return;
    }

    if (pendingAppendOffset === currentOffset) {
      setLoadedOrders((previousOrders) => {
        const existingIds = new Set((previousOrders ?? []).map((order) => order.id));
        return [...(previousOrders ?? []), ...currentPageOrders.filter((order) => !existingIds.has(order.id))];
      });
      setHasMoreOrders(currentPageOrders.length === PAGE_SIZE);
      setPendingAppendOffset(null);
      lastIntegratedPageKeyRef.current = currentPageKey;
      return;
    }

    lastIntegratedPageKeyRef.current = null;
    setCurrentOffset(0);
    setPendingAppendOffset(null);
    setLoadedOrders(undefined);
    setHasMoreOrders(false);
  }, [currentOffset, currentPageOrders, fulfilledTimeStamp, pendingAppendOffset, queryKey]);

  const orders = loadedOrders;

  const tableRowsData = React.useMemo((): TableRowData[] => {
    if (!orders) {
      return [];
    }

    const rows: TableRowData[] = [];
    orders.forEach((order) => {
      if (order.line_items && order.line_items.length > 0) {
        order.line_items.forEach((lineItem: LineItem) => {
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
            quantity: lineItem.quantity,
            productPrice: lineItem.product_price,
            total: totalPrice,
          });
        });
      } else if (productId === undefined) {
        rows.push({
          order,
          lineItem: {
            product: {
              id: 0,
              name: "-",
              price: 0,
              fixed_price: true,
              is_locked: false,
              has_bookings: false,
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
          quantity: 0,
          productPrice: 0,
          total: order.total_price,
        });
      }
    });

    return rows;
  }, [orders, productId, tills]);

  const orderTypes = React.useMemo(() => {
    const types = new Set<string>();
    tableRowsData.forEach((row) => {
      if (row.orderType) {
        types.add(row.orderType);
      }
    });
    return Array.from(types).sort();
  }, [tableRowsData]);

  const columnFilters: ColumnFilterConfig[] = React.useMemo(
    () => [
      {
        field: "orderType",
        label: t("overview.orderType"),
        type: "select",
        options: [{ value: "", label: t("overview.all") }, ...orderTypes.map((type) => ({ value: type, label: type }))],
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

  const handleLoadNextPage = React.useCallback(() => {
    if (!hasMoreOrders) {
      return;
    }

    const nextOffset = currentOffset + PAGE_SIZE;
    setPendingAppendOffset(nextOffset);
    setCurrentOffset(nextOffset);
  }, [currentOffset, hasMoreOrders]);

  if (!canViewOrderLinks || !enabled) {
    return null;
  }

  if (isLoading && !orders) {
    return (
      <Card
        sx={{
          backgroundColor: (themeOverride) =>
            themeOverride.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (themeOverride) =>
            `1px solid ${themeOverride.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
          <Skeleton variant="rounded" height={isSmallMobile ? 250 : isMobile ? 300 : 400} />
        </CardContent>
      </Card>
    );
  }

  if (!orders) {
    return (
      <Card
        sx={{
          backgroundColor: (themeOverride) =>
            themeOverride.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (themeOverride) =>
            `1px solid ${themeOverride.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
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
          backgroundColor: (themeOverride) =>
            themeOverride.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
          border: (themeOverride) =>
            `1px solid ${themeOverride.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {t("overview.noOrdersFound")}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: (themeOverride) =>
          themeOverride.palette.mode === "dark" ? "rgba(26, 27, 30, 0.8)" : "rgba(255, 255, 255, 0.9)",
        border: (themeOverride) =>
          `1px solid ${themeOverride.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
        boxShadow: "none",
      }}
    >
      <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
        <Stack spacing={2}>
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

          {isSmallMobile ? (
            <Stack spacing={1}>
              {filteredData.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.8rem", textAlign: "center", py: 2 }}
                >
                  {t("overview.noOrdersMatchFilter")}
                </Typography>
              ) : (
                filteredData.map((row, idx) => (
                  <Box
                    key={`${row.order.id}-${idx}`}
                    sx={{
                      border: (themeOverride) =>
                        `1px solid ${themeOverride.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
                      borderRadius: 1,
                      p: 1.25,
                    }}
                  >
                    <Stack spacing={0.4}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        {canViewOrderLinks ? (
                          <Link
                            to={`/node/${currentNode.id}/orders/${row.order.id}`}
                            style={{ color: "#73BF69", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem" }}
                          >
                            #{row.order.id}
                          </Link>
                        ) : (
                          <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>#{row.order.id}</Typography>
                        )}
                        <Typography sx={{ color: "#73BF69", fontWeight: 600, fontSize: "0.85rem" }}>
                          {formatCurrency(row.lineItem.total_price)}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>{row.lineItem.product.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                        {DateTime.fromISO(row.order.booked_at).toFormat("MM-dd HH:mm")} · {t("item.quantity")}:{" "}
                        {row.lineItem.quantity}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                        {t("overview.orderType")}: {row.order.order_type} · {t("common.till")}: {row.tillName}
                      </Typography>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          ) : (
            <Box
              sx={{
                width: "100%",
                overflowX: "auto",
                "&::-webkit-scrollbar": {
                  height: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: (themeOverride) =>
                    themeOverride.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
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
                        field="productPrice"
                        label={t("item.productPrice")}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={(field) => setSort(field)}
                        align="right"
                      />
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
                    {filteredData.length === 0 ? (
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
                      filteredData.map((row, idx) => (
                        <TableRow key={`${row.order.id}-${idx}`}>
                          <TableCell>
                            {isMobile
                              ? DateTime.fromISO(row.order.booked_at).toFormat("MM-dd HH:mm")
                              : DateTime.fromISO(row.order.booked_at).toFormat("yyyy-MM-dd HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            {canViewOrderLinks ? (
                              <Link
                                to={`/node/${currentNode.id}/orders/${row.order.id}`}
                                style={{
                                  color: "#73BF69",
                                  textDecoration: "none",
                                  transition: "color 0.2s ease-in-out",
                                  fontSize: "inherit",
                                }}
                                onMouseEnter={(event) => {
                                  event.currentTarget.style.textDecoration = "underline";
                                }}
                                onMouseLeave={(event) => {
                                  event.currentTarget.style.textDecoration = "none";
                                }}
                              >
                                {row.order.id}
                              </Link>
                            ) : (
                              row.order.id
                            )}
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
          )}

          {hasMoreOrders && (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={handleLoadNextPage}
                endIcon={<ExpandMoreIcon />}
                sx={{
                  color: "#73BF69",
                  textTransform: "none",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  "&:hover": {
                    backgroundColor: "rgba(115, 191, 105, 0.1)",
                  },
                }}
              >
                {t("overview.showMore", { count: PAGE_SIZE })}
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
