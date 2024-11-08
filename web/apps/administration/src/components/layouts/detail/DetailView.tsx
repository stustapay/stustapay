import { List, Paper, PaperProps } from "@mui/material";
import * as React from "react";

export const DetailView: React.FC<PaperProps> = ({ children, ...props }) => {
  return (
    <Paper {...props}>
      <List>{children}</List>
    </Paper>
  );
};
