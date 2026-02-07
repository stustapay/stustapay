import * as React from "react";
import { DateTime } from "luxon";
import {
  Card,
  CardContent,
  Typography,
  Skeleton,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  SortByAlpha as SortByAlphaIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { BarChart, BarChartData } from "@/components";
import { FilterBadge } from "@/components/common/FilterBadge";
import { useCurrentNode, useCurrencyFormatter } from "@/hooks";
import { useGetProductStatsQuery } from "@/api";
import { useTranslation } from "react-i18next";

export type RevenueByProductChartProps = {
  fromTimestamp?: DateTime;
  toTimestamp?: DateTime;
  tillId?: number;
  subnodeId?: number;
  productId?: number;
  pollingIntervalMs?: number;
  onProductClick?: (productId: number) => void;
  onClearFilter?: () => void;
};

type SortOption = "revenue-desc" | "revenue-asc" | "name-asc" | "name-desc";

export const RevenueByProductChart: React.FC<RevenueByProductChartProps> = ({
  fromTimestamp,
  toTimestamp,
  tillId,
  subnodeId,
  productId,
  pollingIntervalMs = 0,
  onProductClick,
  onClearFilter,
}) => {
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [sortOption, setSortOption] = React.useState<SortOption>("revenue-desc");
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
    handleMenuClose();
  };

  const { data, isLoading } = useGetProductStatsQuery(
    {
      nodeId: currentNode.id,
      fromTimestamp: fromTimestamp?.toISO() ?? undefined,
      toTimestamp: toTimestamp?.toISO() ?? undefined,
      tillId: tillId,
      subnodeId: subnodeId,
    },
    { pollingInterval: pollingIntervalMs }
  );

  // Create a map of product_name to product_id for bar click handling
  const productNameToIdMap = React.useMemo(() => {
    if (!data) return new Map<string, number>();
    const map = new Map<string, number>();
    [...(data.product_overall_stats || []), ...(data.deposit_overall_stats || [])].forEach((product) => {
      map.set(product.product_name, product.product_id);
    });
    return map;
  }, [data]);

  // Filter and sort the data
  const chartData: BarChartData[] = React.useMemo(() => {
    if (!data) return [];

    // Combine product and deposit stats
    const allProducts = [...(data.product_overall_stats || []), ...(data.deposit_overall_stats || [])];

    // Apply sorting
    const sorted = [...allProducts];
    switch (sortOption) {
      case "revenue-desc":
        sorted.sort((a, b) => Math.abs(b.revenue) - Math.abs(a.revenue));
        break;
      case "revenue-asc":
        sorted.sort((a, b) => Math.abs(a.revenue) - Math.abs(b.revenue));
        break;
      case "name-asc":
        sorted.sort((a, b) => a.product_name.localeCompare(b.product_name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.product_name.localeCompare(a.product_name));
        break;
    }

    return sorted.map((product) => ({
      id: product.product_name,
      value: product.revenue,
      label: formatCurrency(product.revenue),
    }));
  }, [data, sortOption, formatCurrency]);

  const chartHeight = React.useMemo(() => {
    if (isSmallMobile) {
      return Math.min(Math.max(chartData.length * 24, 180), 380);
    }
    if (isMobile) {
      return Math.min(Math.max(chartData.length * 26, 220), 440);
    }
    return 300;
  }, [chartData.length, isMobile, isSmallMobile]);

  const handleBarClick = React.useCallback(
    (barData: BarChartData) => {
      if (onProductClick) {
        const clickedProductId = productNameToIdMap.get(barData.id);
        if (clickedProductId !== undefined) {
          onProductClick(clickedProductId);
        }
      }
    },
    [onProductClick, productNameToIdMap]
  );

  // Get filtered product name for badge
  const filteredProductName = React.useMemo(() => {
    if (productId === undefined || !data) return "";
    const allProducts = [...(data.product_overall_stats || []), ...(data.deposit_overall_stats || [])];
    const product = allProducts.find((p) => p.product_id === productId);
    return product?.product_name || String(productId);
  }, [productId, data]);

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
                        {t("overview.revenuePerProduct")}
                    </Typography>
                    <Skeleton variant="rounded" height={isMobile ? 250 : 300} />
                </CardContent>
            </Card>
        );
    }

    if (!data) {
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
                        {t("overview.revenuePerProduct")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        {t("overview.noDataAvailable")}
                    </Typography>
                </CardContent>
            </Card>
        );
    }

  if (data && chartData.length === 0 && !isLoading) {
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
            {t("overview.revenuePerProduct")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {t("overview.noProductDataAvailable")}
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
      <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
        <Stack spacing={{ xs: 1, sm: 1.5, md: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                {t("overview.revenuePerProduct")}
              </Typography>
              {productId !== undefined && onClearFilter && (
                <FilterBadge
                  label={t("overview.filteredBy")}
                  value={filteredProductName}
                  onClear={onClearFilter}
                  visible={true}
                />
              )}
            </Stack>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "#73BF69",
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem disabled sx={{ opacity: 0.7, fontSize: "0.75rem", textTransform: "uppercase" }}>
                {t("overview.sortBy")}
              </MenuItem>
              <MenuItem onClick={() => handleSortChange("revenue-desc")}>
                <ListItemIcon>
                  {sortOption === "revenue-desc" ? <CheckIcon fontSize="small" sx={{ color: "#73BF69" }} /> : <TrendingUpIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{t("overview.revenueDescending")}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleSortChange("revenue-asc")}>
                <ListItemIcon>
                  {sortOption === "revenue-asc" ? <CheckIcon fontSize="small" sx={{ color: "#73BF69" }} /> : <TrendingUpIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{t("overview.revenueAscending")}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleSortChange("name-asc")}>
                <ListItemIcon>
                  {sortOption === "name-asc" ? <CheckIcon fontSize="small" sx={{ color: "#73BF69" }} /> : <SortByAlphaIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{t("overview.nameAscending")}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleSortChange("name-desc")}>
                <ListItemIcon>
                  {sortOption === "name-desc" ? <CheckIcon fontSize="small" sx={{ color: "#73BF69" }} /> : <SortByAlphaIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{t("overview.nameDescending")}</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>

          <BarChart
            data={chartData}
            height={chartHeight}
            useCurrency
            horizontal={isMobile}
            onBarClick={onProductClick ? handleBarClick : undefined}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
