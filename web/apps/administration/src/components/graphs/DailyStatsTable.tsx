import * as React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { DateTime } from "luxon";
import { TimeseriesStats } from "@/api";
import { useCurrencyFormatter } from "@/hooks";

export type DailyStatsTableProps = {
  useRevenue: boolean;
  data: TimeseriesStats;
};

export const DailyStatsTable: React.FC<DailyStatsTableProps> = ({ data, useRevenue }) => {
  const formatCurrency = useCurrencyFormatter();

  const transformedData = React.useMemo(() => {
    return data.daily_intervals.map((interval) => {
      const d = DateTime.fromISO(interval.from_time);
      return {
        day: d.toFormat("cccc"),
        value: useRevenue ? formatCurrency(interval.revenue) : interval.count,
      };
    });
  }, [data, formatCurrency, useRevenue]);

  const total = data.daily_intervals.reduce((acc, curr) => acc + (useRevenue ? curr.revenue : curr.count), 0);

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Day</TableCell>
            <TableCell align="right">{useRevenue ? "Revenue" : "Count"}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transformedData.map((row) => (
            <TableRow key={row.day}>
              <TableCell component="th" scope="row">
                {row.day}
              </TableCell>
              <TableCell align="right">{row.value}</TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
            <TableCell component="th" scope="row">
              <strong>Total</strong>
            </TableCell>
            <TableCell align="right">{useRevenue ? formatCurrency(total) : total}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};
