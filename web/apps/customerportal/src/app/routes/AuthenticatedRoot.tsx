import { useCheckCheckoutMutation, useGetCustomerQuery, useLogoutMutation } from "@/api";
import { config } from "@/api/common";
import { LanguageSelect, Layout } from "@/components";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import { Menu as MenuIcon } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { TestModeDisclaimer } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const publicConfig = usePublicConfig();
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const [checkCheckout] = useCheckCheckoutMutation();
  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const processedAPMRedirect = React.useRef<string | null>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  if (!isAuthenticated) {
    const next = location.pathname !== "/logout" ? `?next=${location.pathname}` : "";
    return <Navigate to={`/login${next}`} />;
  }

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
      .then(() => {
        navigate("/login");
      })
      .catch((err: any) => console.error("error during logout", err));
  };

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
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 } }}>
              {/* Mobile menu icon */}
              <Box sx={{ display: { xs: "flex", md: "none" }, mr: 1 }}>
                <IconButton
                  size="small"
                  aria-label="menu"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleOpenNavMenu}
                  color="inherit"
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorElNav}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "left",
                  }}
                  open={Boolean(anchorElNav)}
                  onClose={handleCloseNavMenu}
                  sx={{
                    display: { xs: "block", md: "none" },
                  }}
                >
                  {navbarLinks.map((link) => (
                    <MenuItem key={link.link} component={RouterLink} to={link.link} onClick={handleCloseNavMenu}>
                      {link.label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              {/* Event name - desktop */}
              <Typography
                variant="h6"
                component="div"
                noWrap
                sx={{
                  mr: 4,
                  display: { xs: "none", md: "flex" },
                  fontWeight: 700,
                  textDecoration: "none",
                  maxWidth: { md: "300px", lg: "400px" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
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

              {/* Event name - mobile */}
              <Typography
                variant="body1"
                component="div"
                noWrap
                sx={{
                  display: { xs: "flex", md: "none" },
                  flexGrow: 1,
                  fontWeight: 600,
                  fontSize: "1rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  mr: 1,
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

              {/* Desktop navigation links */}
              <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, gap: 1 }}>
                {navbarLinks.map((link) => (
                  <Button
                    key={link.link}
                    onClick={handleCloseNavMenu}
                    component={RouterLink}
                    color="inherit"
                    to={link.link}
                    size="small"
                  >
                    {link.label}
                  </Button>
                ))}
              </Box>

              {/* Language select and logout */}
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
                  color="inherit"
                  onClick={handleLogout}
                  size="small"
                  sx={{
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    padding: { xs: "4px 8px", sm: "6px 16px" },
                    minWidth: { xs: "auto", sm: "64px" },
                  }}
                >
                  {t("logout")}
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
