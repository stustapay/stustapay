import { config } from "@/api/common";
import { LanguageSelect, Layout } from "@/components";
import { AppBar, Box, Button, CircularProgress, Container, CssBaseline, Toolbar, Typography } from "@mui/material";
import { TestModeDisclaimer } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink } from "react-router-dom";

export const UnauthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar position="fixed">
          <Container maxWidth="xl">
            <Toolbar disableGutters>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
                  {t("StuStaPay")}
                </RouterLink>
              </Typography>
              <LanguageSelect sx={{ color: "inherit" }} variant="outlined" />
              <Button component={RouterLink} color="inherit" to="/login">
                {t("login")}
              </Button>
            </Toolbar>
          </Container>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
          }}
        >
          <Toolbar />
          <Container maxWidth="lg" sx={{ padding: { xs: 0, md: 1, lg: 3 } }}>
            <TestModeDisclaimer
              testMode={config.apiConfig.test_mode}
              testModeMessage={config.apiConfig.test_mode_message}
            />
            <React.Suspense fallback={<CircularProgress />}>
              <Outlet />
            </React.Suspense>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
};
