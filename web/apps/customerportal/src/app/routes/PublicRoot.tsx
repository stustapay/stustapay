import { useLogoutMutation } from "@/api";
import { config } from "@/api/common";
import { AppHeader, Layout } from "@/components";
import { usePublicConfig, useThemeColors } from "@/hooks";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import { Box, CircularProgress, Container, CssBaseline } from "@mui/material";
import { TestModeDisclaimer } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";

export const PublicRoot: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const publicConfig = usePublicConfig();
  const authenticated = useAppSelector(selectIsAuthenticated);
  const [logout] = useLogoutMutation();

  useThemeColors();

  const handleLogout = () => {
    logout()
      .unwrap()
      .then(() => {
        navigate("/login");
      })
      .catch((err: any) => console.error("error during logout", err));
  };

  const navbarLinks = [];

  if (authenticated) {
    if (publicConfig.payout_enabled) {
      navbarLinks.push({
        label: t("nav.payout"),
        link: "/payout-info",
      });
    }
    if (publicConfig.sumup_topup_enabled) {
      navbarLinks.push({
        label: t("nav.topup"),
        link: "/topup",
      });
    }
    navbarLinks.push({
      label: t("nav.faq"),
      link: "/faq",
    });
  } else {
    // Basic navigation for non-logged in users could go here if needed,
    // but typically they just see Login button which is handled by AppHeader inside the menu for mobile
    // or as a button for desktop.
    // However, if we want specific public links like FAQ to be in the nav bar:
    navbarLinks.push({
      label: t("nav.faq"),
      link: "/faq",
    });
  }


  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <CssBaseline />
        <AppHeader
          authenticated={authenticated}
          onLogout={handleLogout}
          navbarLinks={navbarLinks}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: "100%",
          }}
        >
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
