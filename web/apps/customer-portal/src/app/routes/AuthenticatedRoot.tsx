import * as React from "react";
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
import { Link as RouterLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Menu as MenuIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import { TestModeDisclaimer } from "@stustapay/components";
import { config } from "@/api";
import i18n from "@/i18n";
import { Layout } from "@/components";

const navbarLinks = [
  {
    label: i18n.t("nav.payout"),
    link: "/payout-info",
  },
  {
    label: i18n.t("nav.topup"),
    link: "/topup",
  },
  {
    label: i18n.t("nav.faq"),
    link: "/faq",
  },
];

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

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
                <Button component={RouterLink} color="inherit" to="/logout">
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
              testMode={config.publicApiConfig.test_mode}
              testModeMessage={config.publicApiConfig.test_mode_message}
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
