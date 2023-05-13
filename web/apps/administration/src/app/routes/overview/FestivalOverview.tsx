import { Card, CardContent, Grid, Typography } from "@mui/material";
import * as React from "react";
import { ResponsivePie } from "@nivo/pie";
import { useTranslation } from "react-i18next";
import { useGetProductStatsQuery } from "@api";
import { Loading } from "@stustapay/components";

const ProductStatsGraph: React.FC = () => {
  const { t } = useTranslation(["overview"]);
  const { data } = useGetProductStatsQuery();

  if (!data) {
    return <Loading />;
  }

  const mappedData = data.ten_most_sold_products.map((d) => ({
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

export const FestivalOverview: React.FC = () => {
  const { t } = useTranslation(["overview"]);
  return (
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <ProductStatsGraph />
      </Grid>
      <Grid item xs={4}>
        <Card>foobar</Card>
      </Grid>
      <Grid item xs={4}>
        <Card>foobar</Card>
      </Grid>
    </Grid>
  );
};
