import * as React from "react";
import { useMediaQuery, PaletteMode, createTheme, ThemeProvider, CssBaseline, Box, Link } from "@mui/material";
import { Router } from "./Router";
import { toast, ToastContainer } from "react-toastify";
import { useAppSelector, selectTheme, selectIsAuthenticated } from "@/store";
import { Loading } from "@stustapay/components";
import { fetchConfig } from "@/api/common";
import { LoggedInFooter } from "./LoggedInFooter";
import { LoggedOutFooter } from "./LoggedOutFooter";

export function App() {
  const [loading, setLoading] = React.useState(true);
  const darkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
  const themeModeStore = useAppSelector(selectTheme);
  const authenticated = useAppSelector(selectIsAuthenticated);

  const themeMode: PaletteMode = themeModeStore === "browser" ? (darkModeSystem ? "dark" : "light") : themeModeStore;

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
        },
      }),
    [themeMode]
  );

  React.useEffect(() => {
    const init = async () => {
      await fetchConfig();
    };
    init()
      .then(() => {
        setLoading(false);
      })
      .catch((e) => {
        toast.error(`Error while fetching config: ${e}`);
      });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer position="top-right" autoClose={4000} pauseOnFocusLoss={false} theme={themeMode} />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Box component="main" sx={{ flex: 1, paddingBottom: "1em" }}>
          {loading ? <Loading /> : <Router />}
        </Box>
        {loading ? <Loading /> : authenticated ? <LoggedInFooter theme={theme} /> : <LoggedOutFooter theme={theme} />}
      </Box>
    </ThemeProvider>
  );
}

export default App;
