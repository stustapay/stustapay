import * as React from "react";
import { useTheme } from "@mui/material/styles";
import {
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Typography,
  List,
  Toolbar,
  CssBaseline,
  Drawer,
  Box,
  CircularProgress,
  Button,
  Alert,
} from "@mui/material";
import {
  Person as PersonIcon,
  ShoppingCart as ShoppingCartIcon,
  PointOfSale as PointOfSaleIcon,
  Dashboard as DashboardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Percent as PercentIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  AccountBalance as AccountBalanceIcon,
  AddShoppingCart as AddShoppingCartIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { Outlet, Navigate, useLocation, Link as RouterLink } from "react-router-dom";
import { ExpandableLinkMenu, ListItemLink, Loading } from "@components";
import { useTranslation } from "react-i18next";
import { useAppSelector, selectCurrentUser } from "@store";
import { AppBar, Main, DrawerHeader, drawerWidth } from "@components";
import { PrivilegeAdmin } from "@models";
import { useGetConfigEntriesQuery } from "@api";

const AdminMenu: React.FC = () => {
  const { t } = useTranslation(["common"]);
  return (
    <ExpandableLinkMenu label={t("advanced")}>
      <List sx={{ pl: 2 }}>
        <ListItemLink to="/users">
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary={t("users")} />
        </ListItemLink>
        <ListItemLink to="/settings">
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary={t("settings")} />
        </ListItemLink>
      </List>
    </ExpandableLinkMenu>
  );
};

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation(["common"]);
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const location = useLocation();

  const user = useAppSelector(selectCurrentUser);
  const { error: configLoadingError, isLoading: isConfigLoading } = useGetConfigEntriesQuery();

  const isLoading = isConfigLoading;
  const isError = configLoadingError;

  if (!user) {
    const next = location.pathname !== "/logout" ? `?next=${location.pathname}` : "";
    return <Navigate to={`/login${next}`} />;
  }
  const isAdmin = user.privileges.includes(PrivilegeAdmin);

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
        <List>
          <ListItemLink to="/">
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary={t("overview")} />
          </ListItemLink>
          <ListItemLink to="/cashiers">
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary={t("cashiers")} />
          </ListItemLink>
          <ListItemLink to="/tax-rates">
            <ListItemIcon>
              <PercentIcon />
            </ListItemIcon>
            <ListItemText primary={t("taxRates")} />
          </ListItemLink>
          <ListItemLink to="/products">
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary={t("products")} />
          </ListItemLink>
          <ListItemLink to="/till-buttons">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tillButtons")} />
          </ListItemLink>
          <ListItemLink to="/till-layouts">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tillLayouts")} />
          </ListItemLink>
          <ListItemLink to="/till-profiles">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tillProfiles")} />
          </ListItemLink>
          <ListItemLink to="/tills">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tills")} />
          </ListItemLink>
          <ExpandableLinkMenu label={t("accounts")}>
            <List sx={{ pl: 2 }}>
              <ListItemLink to="/find-accounts">
                <ListItemIcon>
                  <SearchIcon />
                </ListItemIcon>
                <ListItemText primary={t("findAccounts")} />
              </ListItemLink>
              <ListItemLink to="/system-accounts">
                <ListItemIcon>
                  <AccountBalanceIcon />
                </ListItemIcon>
                <ListItemText primary={t("systemAccounts")} />
              </ListItemLink>
            </List>
          </ExpandableLinkMenu>
          <ListItemLink to="/orders">
            <ListItemIcon>
              <AddShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary={t("orders")} />
          </ListItemLink>
          {isAdmin && <AdminMenu />}
        </List>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <Alert color="error">{t("configLoadingError")}</Alert>
        ) : (
          <React.Suspense fallback={<CircularProgress />}>
            <Outlet />
          </React.Suspense>
        )}
      </Main>
    </Box>
  );
};
