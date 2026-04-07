import { useCheckCheckoutMutation, useGetCustomerQuery, useLogoutMutation } from "@/api";
import { config } from "@/api/common";
import { AppHeader, Layout } from "@/components";
import { usePublicConfig, useThemeColors } from "@/hooks";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import { Box, CircularProgress, Container, CssBaseline } from "@mui/material";
import { TestModeDisclaimer } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const publicConfig = usePublicConfig();
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const [checkCheckout] = useCheckCheckoutMutation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery(undefined, {
    skip: !isAuthenticated,
  });

  useThemeColors();

  const processedAPMRedirect = React.useRef<string | null>(null);

  // Handle APM redirect back from payment provider
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const orderUuid = urlParams.get('order_uuid');

    if (orderUuid && customer && !customerError && !isCustomerLoading && processedAPMRedirect.current !== orderUuid) {
      processedAPMRedirect.current = orderUuid;

      // For APMs, we need to poll the payment status until it's confirmed
      const checkAPMPaymentStatus = () => {
        checkCheckout({ checkCheckoutPayload: { order_uuid: orderUuid } })
          .unwrap()
          .then((resp) => {
            if (resp.status === "PAID") {
              // Clear the URL parameters so user doesn't see order_uuid after success
              window.history.replaceState({}, document.title, window.location.pathname);
              // Navigate to topup page with success state
              navigate("/topup", { state: { apmSuccess: true } });
            } else if (resp.status === "FAILED") {
              // Clear the URL parameters on failure too
              window.history.replaceState({}, document.title, window.location.pathname);
              // Navigate to topup page with error state
              navigate("/topup", { state: { apmError: true } });
            } else {
              // Payment is still pending, keep checking
              setTimeout(checkAPMPaymentStatus, 2000);
            }
          })
          .catch((error) => {
            // Clear the URL parameters on error
            window.history.replaceState({}, document.title, window.location.pathname);
            // Reset the processed redirect so user can try again
            processedAPMRedirect.current = null;
            // Navigate to topup page with error state
            navigate("/topup", { state: { apmError: true } });
          });
      };

      // Start checking payment status
      checkAPMPaymentStatus();
    }
  }, [location.search, customer, customerError, isCustomerLoading, checkCheckout, navigate]);

  const handleLogout = () => {
    logout()
      .unwrap()
      .catch((err: any) => console.error("error during logout", err));
  };

  if (!isAuthenticated) {
    const next = location.pathname !== "/logout" ? `?next=${location.pathname}` : "";
    return <Navigate to={`/login${next}`} />;
  }

  const navbarLinks = [];
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

  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <CssBaseline />
        <AppHeader
          authenticated={true}
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
          {/* Spacer to prevent content from being hidden under fixed AppBar handled inside AppHeader now? No, kept separately for structure flexibility or updated in AppHeader? Updated in AppHeader */}
          {/* AppHeader includes the spacer and banner, wait, I put spacer and banner INSIDE AppHeader. So I don't need them here. */}

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
