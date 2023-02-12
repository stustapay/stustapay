import * as React from "react";
import { Link as RouterLink, Outlet, Navigate, useSearchParams } from "react-router-dom";
import { AppBar, Box, Button, CircularProgress, Container, CssBaseline, Toolbar, Typography } from "@mui/material";
import { selectIsAuthenticated, useAppSelector } from "@store";

export const UnauthenticatedRoot: React.FC = () => {
  const authenticated = useAppSelector(selectIsAuthenticated);

  const [query] = useSearchParams();

  if (authenticated) {
    const next = query.get("next");
    const redirectUrl = next ? next : "/";
    return <Navigate to={redirectUrl} />;
  }

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
              StuStaPay
            </RouterLink>
          </Typography>
          <Button component={RouterLink} color="inherit" to="/login">
            Login
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ padding: { xs: 0, md: 1, lg: 3 } }}>
          <React.Suspense fallback={<CircularProgress />}>
            <Outlet />
          </React.Suspense>
        </Container>
      </Box>
    </Box>
  );
};
