import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Typography,
  List,
  Toolbar,
  AppBar as MuiAppBar,
  AppBarProps as MuiAppBarProps,
  CssBaseline,
  Drawer,
  Box,
  CircularProgress,
  Button,
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
} from "@mui/icons-material";
import { Outlet, Navigate, useLocation, Link as RouterLink } from "react-router-dom";
import { ListItemLink } from "@components";
import { useTranslation } from "react-i18next";
import { useAppSelector, selectIsAuthenticated } from "@store";

const drawerWidth = 240;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation(["common"]);
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const location = useLocation();

  const authenticated = useAppSelector(selectIsAuthenticated);

  if (!authenticated) {
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
          <ListItemLink to="/terminal-buttons">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("terminalButtons")} />
          </ListItemLink>
          <ListItemLink to="/terminal-layouts">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("terminalLayouts")} />
          </ListItemLink>
          <ListItemLink to="/terminal-profiles">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("terminalProfiles")} />
          </ListItemLink>
          <ListItemLink to="/terminals">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("terminals")} />
          </ListItemLink>
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
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <React.Suspense fallback={<CircularProgress />}>
          <Outlet />
        </React.Suspense>
      </Main>
    </Box>
  );
};
