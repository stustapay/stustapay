import * as React from "react";
import { useMediaQuery, PaletteMode, createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { Router } from "./Router";
import { ToastContainer } from "react-toastify";
import { useAppSelector, selectTheme } from "@/store";
import { Loading } from "@stustapay/components";
import { config, fetchConfig } from "@/api/common";
import { CurrencyProvider } from "@stustapay/framework";
import { ConfigLoadErrorPage } from "./ConfigLoadErrorPage";
import { CurrencyIdentifier } from "@stustapay/models";

export function App() {
  const [state, setState] = React.useState<"loading" | "loaded" | "error">("loading");
  const darkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
  const themeModeStore = useAppSelector(selectTheme);

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
        setState("loaded");
      })
      .catch(() => {
        setState("error");
      });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer position="top-right" autoClose={4000} pauseOnFocusLoss={false} theme={themeMode} />
      {state === "loading" ? (
        <Loading />
      ) : state === "error" ? (
        <ConfigLoadErrorPage />
      ) : (
        <CurrencyProvider currencyIdentifier={config.apiConfig.currency_identifier as CurrencyIdentifier}>
          <Router />
        </CurrencyProvider>
      )}
    </ThemeProvider>
  );
}

export default App;
