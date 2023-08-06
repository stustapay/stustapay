import * as React from "react";
import { useTheme } from "@mui/material/styles";
import {
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
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { Link as RouterLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { AppBar, DrawerHeader, Main } from "@components";
import { drawerWidth } from "@/components/layouts/constants";
import { useTranslation } from "react-i18next";
import { selectCurrentUser, useAppSelector } from "@store";
import { TestModeDisclaimer } from "@stustapay/components";
import { config } from "@api/common";
import { NavigationTree } from "./navigation-tree";

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const location = useLocation();

  const user = useAppSelector(selectCurrentUser);

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
          <Button component={RouterLink} color="inherit" to="/logout">
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
        <NavigationTree />
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <TestModeDisclaimer testMode={config.testMode} testModeMessage={config.testModeMessage} />
        <React.Suspense fallback={<CircularProgress />}>
          <Outlet />
        </React.Suspense>
      </Main>
    </Box>
  );
};
