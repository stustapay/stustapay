import * as React from "react";
import { Link as RouterLink, Outlet, Navigate, useSearchParams } from "react-router-dom";
import { AppBar, Box, Button, CircularProgress, Container, CssBaseline, Toolbar, Typography } from "@mui/material";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { TestModeDisclaimer } from "@stustapay/components";
import { config } from "@/api";
import { LanguageSelect } from "@/components/LanguageSelect";

export const UnauthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const authenticated = useAppSelector(selectIsAuthenticated);

  const [query] = useSearchParams();

  if (authenticated) {
    const next = query.get("next");
    const redirectUrl = next != null ? next : "/";
    return <Navigate to={redirectUrl} />;
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
          <Button component={RouterLink} color="inherit" to="/login">
            {t("login")}
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
