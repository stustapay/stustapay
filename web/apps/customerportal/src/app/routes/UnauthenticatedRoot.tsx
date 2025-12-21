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
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 } }}>
              <Typography
                variant="h6"
                component="div"
                noWrap
                sx={{
                  flexGrow: 1,
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  mr: 2,
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                }}
              >
                <RouterLink
                  to="/"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(config.apiConfig.event_name)}
                </RouterLink>
              </Typography>
              <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 }, alignItems: "center" }}>
                <LanguageSelect
                  sx={{
                    color: "inherit",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    },
                    "& .MuiSelect-select": {
                      padding: { xs: "4px 8px", sm: "8px 12px" },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                  }}
                  variant="outlined"
                />
                <Button
                  component={RouterLink}
                  color="inherit"
                  to="/login"
                  size="small"
                  sx={{
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    padding: { xs: "4px 8px", sm: "6px 16px" },
                    minWidth: { xs: "auto", sm: "64px" },
                  }}
                >
                  {t("login")}
                </Button>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: "100%",
          }}
        >
          {/* Spacer to prevent content from being hidden under fixed AppBar */}
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
          <Container
            maxWidth="lg"
            sx={{
              padding: { xs: 2, sm: 2, md: 3, lg: 3 },
              paddingTop: { xs: 2, sm: 2 },
            }}
          >
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
