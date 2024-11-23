import { useLogoutMutation } from "@/api";
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

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);

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

  const handleLogout = () => {
    logout()
      .unwrap()
      .then(() => {
        navigate("/login");
      })
      .catch((err) => console.error("error during logout", err));
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
        <AppBar position="fixed">
          <Container maxWidth="xl">
            <Toolbar disableGutters>
              <Typography variant="h6" component="div" sx={{ mr: 2, display: { xs: "none", md: "flex" } }}>
                <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
                  {t("StuStaPay")}
                </RouterLink>
              </Typography>

              <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
                <IconButton
                  size="large"
                  aria-label="account of current user"
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
              <Typography
                variant="h6"
                component="div"
                sx={{
                  display: { xs: "flex", md: "none" },
                  flexGrow: 1,
                }}
              >
                <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
                  {t("StuStaPay")}
                </RouterLink>
              </Typography>

              <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
                {navbarLinks.map((link) => (
                  <Button
                    key={link.link}
                    onClick={handleCloseNavMenu}
                    component={RouterLink}
                    color="inherit"
                    to={link.link}
                  >
                    {link.label}
                  </Button>
                ))}
              </Box>

              <Box sx={{ flexGrow: 0 }}>
                <LanguageSelect sx={{ color: "inherit" }} variant="outlined" />
                <Button color="inherit" onClick={handleLogout}>
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
