import { Box, Paper, Stack, Typography } from "@mui/material";
import * as React from "react";

export interface MaintenancePageProps {
  brandName: string;
  title: string;
  message: string;
  logoSrc?: string;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ brandName, title, message, logoSrc }) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", px: 2, py: { xs: 6, md: 10 } }}>
      <Paper elevation={3} sx={{ width: "100%", maxWidth: 560, borderRadius: 4, px: { xs: 3, md: 6 }, py: { xs: 5, md: 7 } }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          {logoSrc ? (
            <Box component="img" src={logoSrc} alt={`${brandName} logo`} sx={{ width: 144, maxWidth: "100%", height: "auto" }} />
          ) : null}
          <Typography variant="overline" sx={{ letterSpacing: "0.14em" }}>
            {brandName}
          </Typography>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {message}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};
