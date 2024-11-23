import { useGetTreeForCurrentUserQuery, useLogoutMutation } from "@/api";
import { config } from "@/api/common";
import { AppBar, DrawerHeader, Main } from "@/components";
import { drawerWidth } from "@/components/layouts/constants";
import { selectCurrentUser, useAppSelector } from "@/store";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Loading, TestModeDisclaimer } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { NavigationTree } from "./navigation-tree";

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const location = useLocation();
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();

  const user = useAppSelector(selectCurrentUser);

  const { isLoading: isTreeLoading, error: treeError } = useGetTreeForCurrentUserQuery();

  if (!user) {
    const next = location.pathname !== "/logout" ? `?next=${location.pathname}` : "";
    return <Navigate to={`/login${next}`} />;
  }

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    logout()
      .unwrap()
      .then(() => {
        navigate("/login");
      })
      .catch((err) => console.error("error during logout", err));
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
              {t("StuStaPay")}
            </RouterLink>
          </Typography>
          <Button component={RouterLink} color="inherit" to="/profile">
            {t("auth.profile")}
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            {t("logout")}
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === "ltr" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        {/* <Sidebar /> */}
        {isTreeLoading ? (
          <Loading />
        ) : treeError ? (
          <Alert severity="error">
            <AlertTitle>Error loading tree data</AlertTitle>
          </Alert>
        ) : (
          <NavigationTree />
        )}
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <TestModeDisclaimer testMode={config.testMode} testModeMessage={config.testModeMessage} />
        <React.Suspense fallback={<CircularProgress />}>
          {isTreeLoading ? (
            <Loading />
          ) : treeError ? (
            <Alert severity="error">
              <AlertTitle>Error loading tree data</AlertTitle>
            </Alert>
          ) : (
            <Outlet />
          )}
        </React.Suspense>
      </Main>
    </Box>
  );
};
