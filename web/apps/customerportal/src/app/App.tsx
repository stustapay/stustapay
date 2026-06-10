import { useMediaQuery, PaletteMode, createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { Loading } from "@stustapay/components";
import { CurrencyProvider } from "@stustapay/framework";
import { CurrencyIdentifier } from "@stustapay/models";
import * as React from "react";
import { ToastContainer } from "react-toastify";

import { config, fetchConfig } from "@/api/common";
import { useAppSelector, selectTheme } from "@/store";

import { ConfigLoadErrorPage } from "./ConfigLoadErrorPage";
import { Router } from "./Router";

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
      document.title = `StuStaPay - ${config.apiConfig.event_name}`;
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
