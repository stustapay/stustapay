import { ChevronLeft } from "@mui/icons-material";
import { Button, Grid, IconButton, Stack, Typography } from "@mui/material";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutAction } from "./types";

export interface CommonActionLayoutProps {
  title: string;
  children?: React.ReactNode;
  actions?: LayoutAction[];
}

export const CommonActionLayout: React.FC<CommonActionLayoutProps> = ({ title, children, actions }) => {
  const navigate = useNavigate();

  const renderedActions = actions?.map(({ hidden, label, icon, onClick, ...props }, index) => {
    if (hidden) {
      return null;
    }

    if (label) {
      return (
        <Button key={label} variant="outlined" startIcon={icon} onClick={onClick} {...props}>
          {label}
        </Button>
      );
    }
    return (
      <IconButton key={index} onClick={onClick} {...props}>
        {icon}
      </IconButton>
    );
  });

  return (
    <Stack spacing={2}>
      <Grid container spacing={1} justifyContent="space-between">
        <Grid display="flex" alignItems="center">
          <IconButton onClick={() => navigate(-1)}>
            <ChevronLeft />
          </IconButton>
          <Typography component="div" variant="h5">
            {title}
          </Typography>
        </Grid>
        <Grid>
          <Stack direction="row" spacing={1}>
            {renderedActions}
          </Stack>
        </Grid>
      </Grid>
      {children}
    </Stack>
  );
};
