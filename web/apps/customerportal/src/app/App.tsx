import * as React from "react";
import { useMediaQuery, PaletteMode, createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { Router } from "./Router";
import { toast, ToastContainer } from "react-toastify";
import { useAppSelector, selectTheme } from "@/store";
import { Loading } from "@stustapay/components";
import { config, fetchConfig } from "@/api/common";
import { CurrencyProvider } from "@stustapay/framework";

export function App() {
  const [loading, setLoading] = React.useState(true);
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
      {loading ? (
        <Loading />
      ) : (
        <CurrencyProvider currencyIdentifier={config.apiConfig.currency_identifier}>
          <Router />
        </CurrencyProvider>
      )}
    </ThemeProvider>
  );
}

export default App;
