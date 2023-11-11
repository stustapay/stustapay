import { AppBar, Box, Container, CssBaseline, Toolbar } from "@mui/material";
import * as React from "react";

export interface UnauthenticatedLayoutProps {
  toolbar?: React.ReactNode;
  children?: React.ReactNode;
}

export const UnauthenticatedLayout: React.FC<UnauthenticatedLayoutProps> = ({ toolbar, children }) => {
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>{toolbar}</Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ padding: { xs: 0, md: 1, lg: 3 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};
