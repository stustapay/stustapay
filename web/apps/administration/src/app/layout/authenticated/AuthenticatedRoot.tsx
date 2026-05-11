import { useGetProfileQuery, useGetTreeForCurrentUserQuery, useLogoutMutation } from "@/api";
import { config } from "@/api/common";
import { HelpRoutes, getNodeIdFromPath } from "@/app/routes";
import { AppBar, DrawerHeader, Main, LanguageSelect} from "@/components";
import { drawerWidth } from "@/components/layouts/constants";
import { selectCurrentUser, setCurrentUser, useAppDispatch, useAppSelector } from "@/store";
import {
  AccountCircle as AccountCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  HelpOutline as HelpOutlineIcon,
  Logout as LogoutIcon,
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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Loading, TestModeDisclaimer } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { getCurrentNodePath } from "./currentNodePath";
import { NavigationTree } from "./navigation-tree";

export const AuthenticatedRoot: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = React.useState(!isMobile);
  const location = useLocation();
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const currentNodeId = getNodeIdFromPath(location.pathname);
  const helpRoute = HelpRoutes.index(currentNodeId);
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectCurrentUser);
  const { data: currentProfile } = useGetProfileQuery(undefined, { skip: !user });

  const { data: tree, isLoading: isTreeLoading, error: treeError } = useGetTreeForCurrentUserQuery();

  const currentNodePath = React.useMemo(() => {
    if (!tree) {
      return null;
    }

    return getCurrentNodePath(tree, currentNodeId);
  }, [tree, currentNodeId]);

  React.useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [isMobile]);

  React.useEffect(() => {
    if (currentProfile) {
      dispatch(setCurrentUser(currentProfile));
    }
  }, [currentProfile, dispatch]);

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
        <Toolbar sx={{ gap: { xs: 0.5, sm: 1 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden" }}>
            <RouterLink
              to="/"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <Typography variant="h6" component="div" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t("TeamFestlichPay")}
              </Typography>
              {currentNodePath && currentNodePath.length > 0 ? (
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.85 }}
                >
                  {currentNodePath.map((segment) => t(segment)).join(" > ")}
                </Typography>
              ) : null}
            </RouterLink>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
            {isMobile ? (
              <IconButton color="inherit" component={RouterLink} to={helpRoute} size="small" aria-label={t("help.open")}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            ) : (
              <Button component={RouterLink} color="inherit" to={helpRoute} startIcon={<HelpOutlineIcon />}>
                {t("help.open")}
              </Button>
            )}
            {isMobile ? (
              <IconButton color="inherit" component={RouterLink} to="/profile" size="small" aria-label={t("auth.profile")}>
                <AccountCircleIcon fontSize="small" />
              </IconButton>
            ) : (
              <Button component={RouterLink} color="inherit" to="/profile">
                {t("auth.profile")}
              </Button>
            )}
            <LanguageSelect
              variant="outlined"
              size="small"
              sx={{
                color: "inherit",
                minWidth: { xs: 74, sm: 96 },
                "& .MuiSelect-select": {
                  py: { xs: 0.5, sm: 0.75 },
                },
              }}
            />
            {isMobile ? (
              <IconButton color="inherit" onClick={handleLogout} size="small" aria-label={t("logout")}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            ) : (
              <Button color="inherit" onClick={handleLogout}>
                {t("logout")}
              </Button>
            )}
          </Box>
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
