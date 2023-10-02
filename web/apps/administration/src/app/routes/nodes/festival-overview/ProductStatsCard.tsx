import { Card, CardContent, Checkbox, FormControlLabel, Alert, Typography } from "@mui/material";
import * as React from "react";
import { ResponsivePie } from "@nivo/pie";
import { useTranslation } from "react-i18next";
import { useGetProductStatsQuery } from "@api";
import { Loading } from "@stustapay/components";
import { useCurrentNode } from "@hooks";

export interface ProductStatsCardProps {
  fromTimestamp?: string;
  toTimestamp?: string;
}

export const ProductStatsCard: React.FC<ProductStatsCardProps> = ({ fromTimestamp, toTimestamp }) => {
  const { currentNode } = useCurrentNode();
  const { t } = useTranslation();
  const { data, error } = useGetProductStatsQuery({
    nodeId: currentNode.id,
    fromTimestamp: fromTimestamp,
    toTimestamp: toTimestamp,
  });

  const [hideDeposits, setHideDeposits] = React.useState(true);

  if (!data) {
    return <Loading />;
  }

  if (error) {
    return <Alert severity="error">Error loading stats</Alert>;
  }

  const mappedData = data.product_quantities
    .filter((d) => !hideDeposits || !d.is_returnable)
    .slice(0, 10)
    .map((d) => ({
      id: d.id,
      label: d.name,
      value: d.quantity_sold,
    }));

  return (
    <Card sx={{ height: 300 }}>
      <CardContent sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
        <Typography gutterBottom variant="h6" component="div">
          {t("overview.mostSoldProducts")}
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={hideDeposits} onChange={(evt) => setHideDeposits(evt.target.checked)} />}
          label={t("overview.hideDeposits")}
        />
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
