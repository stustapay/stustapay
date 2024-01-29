import { Stack, Box } from "@mui/material";
import * as React from "react";
import { Footer } from "./Footer";

export interface LayoutProps {
  children: React.ReactElement;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Stack
      spacing={2}
      sx={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      <Box component="main" sx={{ flex: 1, paddingBottom: "1em" }}>
        {children}
      </Box>
      <Footer />
    </Stack>
  );
};
