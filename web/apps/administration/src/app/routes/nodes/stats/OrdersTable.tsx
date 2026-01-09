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
  TableSortLabel,
} from "@mui/material";
import { useCurrencyFormatter, useCurrentNode } from "@/hooks";
import { Order, LineItem, LineItemRead, Product, useListTillsQuery, selectTillById } from "@/api";

export type OrdersTableProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
};

type SortField = "datum" | "bestell_nr" | "kasse" | "produkt" | "total";
type SortDirection = "asc" | "desc";

export const OrdersTable: React.FC<OrdersTableProps> = ({ fromTimestamp, toTimestamp, tillId }) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const [sortField, setSortField] = React.useState<SortField>("datum");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const { data: tills } = useListTillsQuery({ nodeId: currentNode.id });

  // TODO: Replace with actual hooks after OpenAPI regeneration
  // const { data: orders, isLoading } = useListOrdersFilteredQuery({
  //   nodeId: currentNode.id,
  //   fromTimestamp: fromTimestamp?.toISO() ?? undefined,
  //   toTimestamp: toTimestamp?.toISO() ?? undefined,
  //   tillId: tillId,
  // });

  const orders: Order[] | undefined = undefined as Order[] | undefined; // Placeholder
  const isLoading = false;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedOrders = React.useMemo((): Order[] => {
    if (!orders) return [];
    const sorted = [...orders];
    sorted.sort((a: Order, b: Order) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "datum":
          aVal = DateTime.fromISO(a.booked_at).toMillis();
          bVal = DateTime.fromISO(b.booked_at).toMillis();
          break;
        case "bestell_nr":
          aVal = a.id;
          bVal = b.id;
          break;
        case "kasse":
          aVal = (tills && a.till_id ? selectTillById(tills, a.till_id)?.name : "") ?? "";
          bVal = (tills && b.till_id ? selectTillById(tills, b.till_id)?.name : "") ?? "";
          break;
        case "total":
          aVal = a.total_price;
          bVal = b.total_price;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [orders, sortField, sortDirection, tills]);

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
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              mb: 2,
              color: "text.secondary",
            }}
          >
            Bestellungen
          </Typography>
          <Skeleton variant="rounded" height={400} />
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
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              mb: 2,
              color: "text.secondary",
            }}
          >
            Bestellungen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            Data will be available after OpenAPI spec regeneration. Please run `make generate-openapi`.
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
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              mb: 2,
              color: "text.secondary",
            }}
          >
            Bestellungen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            No orders found for the selected filters
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Flatten orders with line items for table display
  const tableRows: Array<{
    order: Order;
    lineItem: { product: Product; quantity: number; product_price: number; total_price: number };
  }> = [];
  sortedOrders.forEach((order: Order) => {
    if (order.line_items && order.line_items.length > 0) {
      order.line_items.forEach((lineItem: LineItem) => {
        // LineItem doesn't have total_price, so we calculate it
        const totalPrice = lineItem.product_price * lineItem.quantity;
        tableRows.push({ 
          order, 
          lineItem: { 
            product: lineItem.product,
            quantity: lineItem.quantity,
            product_price: lineItem.product_price,
            total_price: totalPrice,
          }
        });
      });
    } else {
      // Order without line items
      tableRows.push({
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
      });
    }
  });

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
        <Typography
          variant="h6"
          sx={{
            fontSize: "0.875rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            mb: 2,
            color: "text.secondary",
          }}
        >
          Bestellungen
        </Typography>
        <TableContainer>
          <Table size="small" sx={{ "& .MuiTableCell-root": { borderColor: "rgba(255, 255, 255, 0.1)" } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  <TableSortLabel
                    active={sortField === "datum"}
                    direction={sortField === "datum" ? sortDirection : "asc"}
                    onClick={() => handleSort("datum")}
                    sx={{ "& .MuiTableSortLabel-icon": { color: "rgba(255, 255, 255, 0.5) !important" } }}
                  >
                    datum
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  <TableSortLabel
                    active={sortField === "bestell_nr"}
                    direction={sortField === "bestell_nr" ? sortDirection : "asc"}
                    onClick={() => handleSort("bestell_nr")}
                    sx={{ "& .MuiTableSortLabel-icon": { color: "rgba(255, 255, 255, 0.5) !important" } }}
                  >
                    bestell_nr
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  order_type
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  <TableSortLabel
                    active={sortField === "kasse"}
                    direction={sortField === "kasse" ? sortDirection : "asc"}
                    onClick={() => handleSort("kasse")}
                    sx={{ "& .MuiTableSortLabel-icon": { color: "rgba(255, 255, 255, 0.5) !important" } }}
                  >
                    kasse
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  produkt
                </TableCell>
                <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  menge
                </TableCell>
                <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  preis
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "text.secondary", py: 1 }}>
                  <TableSortLabel
                    active={sortField === "total"}
                    direction={sortField === "total" ? sortDirection : "asc"}
                    onClick={() => handleSort("total")}
                    sx={{ "& .MuiTableSortLabel-icon": { color: "rgba(255, 255, 255, 0.5) !important" } }}
                  >
                    total
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row, idx) => (
                <TableRow key={`${row.order.id}-${idx}`} sx={{ "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" } }}>
                  <TableCell sx={{ fontSize: "0.875rem", py: 1 }}>
                    {DateTime.fromISO(row.order.booked_at).toFormat("yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.875rem", py: 1 }}>{row.order.id}</TableCell>
                  <TableCell sx={{ fontSize: "0.875rem", py: 1 }}>{row.order.order_type}</TableCell>
                  <TableCell sx={{ fontSize: "0.875rem", py: 1 }}>
                    {row.order.till_id && tills ? selectTillById(tills, row.order.till_id)?.name ?? "-" : "-"}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.875rem", py: 1 }}>{row.lineItem.product.name}</TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.875rem", py: 1 }}>{row.lineItem.quantity}</TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.875rem", py: 1 }}>{formatCurrency(row.lineItem.product_price)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.875rem", color: "#73BF69", fontWeight: 500, py: 1 }}>
                    {formatCurrency(row.lineItem.total_price)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
