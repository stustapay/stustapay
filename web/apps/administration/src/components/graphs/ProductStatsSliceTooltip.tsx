import type { LineSeries, SliceTooltipProps } from "@nivo/line";
import { Chip, TableTooltip } from "@nivo/tooltip";

export const ProductStatsSliceTooltip = <Series extends LineSeries>({ slice }: SliceTooltipProps<Series>) => {
  return (
    <TableTooltip
      rows={slice.points.map((point) => [
        <Chip key="chip" color={point.seriesColor} />,
        <span key="label" style={{ whiteSpace: "nowrap" }}>
          {point.seriesId}
        </span>,
        <span key="value" style={{ whiteSpace: "nowrap" }}>
          {point.data.yFormatted}
        </span>,
      ])}
    />
  );
};
