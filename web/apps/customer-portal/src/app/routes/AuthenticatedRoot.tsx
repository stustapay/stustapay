import * as React from "react";
import { Typography, Toolbar, CssBaseline, Box, CircularProgress, Button, AppBar, Container } from "@mui/material";
import { Outlet, Navigate, useLocation, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppSelector, selectIsAuthenticated } from "@/store";
import { LanguageSelect } from "@/components/LanguageSelect";
import { TestModeDisclaimer } from "@stustapay/components";
import { config } from "@/api";

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  if (!isAuthenticated) {
    const next = location.pathname !== "/logout" ? `?next=${location.pathname}` : "";
    return <Navigate to={`/login${next}`} />;
  }

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
              {t("StuStaPay")}
            </RouterLink>
          </Typography>
          <LanguageSelect sx={{ color: "inherit" }} variant="outlined" />
          <Button component={RouterLink} color="inherit" to="/logout">
            {t("logout")}
          </Button>
        </Toolbar>
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
            testMode={config.publicApiConfig.test_mode}
            testModeMessage={config.publicApiConfig.test_mode_message}
          />
          <React.Suspense fallback={<CircularProgress />}>
            <Outlet />
          </React.Suspense>
        </Container>
      </Box>
    </Box>
  );
};
