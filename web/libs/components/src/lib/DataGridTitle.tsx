import { Box, Typography } from "@mui/material";
import * as React from "react";

export interface DataGridTitleProps {
  title: string;
}

export const DataGridTitle: React.FC<DataGridTitleProps> = ({ title }) => {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6" component="div">
        {title}
      </Typography>
    </Box>
  );
};
