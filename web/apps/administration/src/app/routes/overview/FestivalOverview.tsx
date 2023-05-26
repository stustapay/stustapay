import {
  Card,
  CardContent,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import * as React from "react";
import { ResponsivePie } from "@nivo/pie";
import { useTranslation } from "react-i18next";
import { selectTillAll, useGetProductStatsQuery, useGetTillsQuery, ProductSoldStats } from "@api";
import { Loading } from "@stustapay/components";
import { DateTime } from "luxon";
import { DateTimePicker } from "@mui/x-date-pickers";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Link as RouterLink } from "react-router-dom";

interface ProductStatsGraphProps {
  fromTimestamp: null | DateTime;
  toTimestamp: null | DateTime;
}

const ProductStatsGraph: React.FC<ProductStatsGraphProps> = ({ fromTimestamp, toTimestamp }) => {
  const { t } = useTranslation();
  const { data } = useGetProductStatsQuery({
    fromTimestamp: fromTimestamp ? fromTimestamp.toISO() : null,
    toTimestamp: toTimestamp ? toTimestamp.toISO() : null,
  });

  if (!data) {
    return <Loading />;
  }

  const mappedData = data.product_quantities.slice(0, 10).map((d) => ({
    id: d.id,
    label: d.name,
    value: d.quantity_sold,
  }));

  return (
    <Card sx={{ height: 300 }}>
      <CardContent>
        <Typography gutterBottom variant="h6" component="div">
          {t("overview.mostSoldProducts")}
        </Typography>
      </CardContent>
      <ResponsivePie
        data={mappedData}
        colors={{ scheme: "red_yellow_blue" }}
        margin={{ top: 20, right: 20, bottom: 90, left: 90 }}
        borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        enableArcLinkLabels={false}
        activeOuterRadiusOffset={8}
        arcLabel={"label"}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
          from: "color",
          modifiers: [["darker", 2]],
        }}
        defs={[
          {
            id: "dots",
            type: "patternDots",
            background: "inherit",
            color: "rgba(255, 255, 255, 0.3)",
            size: 4,
            padding: 1,
            stagger: true,
          },
          {
            id: "lines",
            type: "patternLines",
            background: "inherit",
            color: "rgba(255, 255, 255, 0.3)",
            rotation: -45,
            lineWidth: 6,
            spacing: 10,
          },
        ]}
        borderWidth={1}
        legends={[
          {
            anchor: "top-left",
            direction: "column",
            justify: false,
            itemWidth: 100,
            itemHeight: 20,
            translateX: -70,
            itemDirection: "left-to-right",
          },
        ]}
      />
    </Card>
  );
};

interface TillStatsTableProps {
  fromTimestamp: null | DateTime;
  toTimestamp: null | DateTime;
}

export const TillStatsTable: React.FC<TillStatsTableProps> = ({ toTimestamp, fromTimestamp }) => {
  const { t } = useTranslation();
  const { data } = useGetProductStatsQuery({
    fromTimestamp: fromTimestamp ? fromTimestamp.toISO() : null,
    toTimestamp: toTimestamp ? toTimestamp.toISO() : null,
  });
  const [selectedTill, setSelectedTill] = React.useState<number | null>(null);
  const { data: tills } = useGetTillsQuery();

  if (!data || !tills) {
    return <Loading />;
  }

  const columns: GridColDef<ProductSoldStats>[] = [
    {
      field: "name",
      headerName: t("product.name") as string,
      renderCell: (params) => <RouterLink to={`/products/${params.row.id}`}>{params.row.name}</RouterLink>,
      minWidth: 200,
    },
    {
      field: "quantity_sold",
      headerName: t("overview.quantitySold") as string,
      minWidth: 150,
    },
  ];

  return (
    <Paper>
      <Stack spacing={1}>
        <Box sx={{ p: 1 }}>
          <Typography variant="h5">{t("overview.statsByTill")}</Typography>
        </Box>
        <Box sx={{ p: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{t("overview.selectedTill")}</InputLabel>
            <Select
              variant="standard"
              value={selectedTill ?? ""}
              onChange={(e) => setSelectedTill(e.target.value ? Number(e.target.value) : null)}
            >
              {selectTillAll(tills).map((till) => (
                <MenuItem key={till.id} value={till.id}>
                  {till.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <DataGrid
          autoHeight
          rows={selectedTill != null ? data.product_quantities_by_till[selectedTill] ?? [] : []}
          columns={columns}
          disableRowSelectionOnClick
          sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
        />
      </Stack>
    </Paper>
  );
};

export const FestivalOverview: React.FC = () => {
  const { t } = useTranslation();
  const [fromTimestamp, setFromTimestamp] = React.useState<null | DateTime>(null);
  const [toTimestamp, setToTimestamp] = React.useState<null | DateTime>(null);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <DateTimePicker label={t("overview.fromTimestamp")} value={fromTimestamp} onChange={setFromTimestamp} />
        <DateTimePicker
          label={t("overview.toTimestamp")}
          value={toTimestamp}
          onChange={setToTimestamp}
          sx={{ ml: 1 }}
        />
      </Grid>
      <Grid item xs={4}>
        <ProductStatsGraph fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
      </Grid>
      <Grid item xs={4}>
        <Card>foobar</Card>
      </Grid>
      <Grid item xs={4}>
        <Card>foobar</Card>
      </Grid>
      <Grid item xs={12}>
        <TillStatsTable fromTimestamp={fromTimestamp} toTimestamp={toTimestamp} />
      </Grid>
    </Grid>
  );
};
