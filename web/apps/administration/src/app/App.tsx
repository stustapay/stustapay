import { fetchConfig } from "@/api/common";
import { useAppSelector } from "@/store";
import { selectTheme } from "@/store/uiSlice";
import {
  Alert,
  AlertTitle,
  createTheme,
  CssBaseline,
  PaletteMode,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ToastContainer } from "react-toastify";
import { UnauthenticatedLayout } from "./layout/UnauthenticatedLayout";
import { Router } from "./Router";

export function App() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
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
        setError(t("common.configLoadFailed", { what: e.toString() }));
      });
  }, [t]);

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UnauthenticatedLayout
          toolbar={
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {t("StuStaPay")}
            </Typography>
          }
        >
          <Alert severity="error">
            <AlertTitle>{t("common.loadingError")}</AlertTitle>
            {error}
          </Alert>
        </UnauthenticatedLayout>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer position="top-right" autoClose={4000} pauseOnFocusLoss={false} theme={themeMode} />
      {loading ? <Loading /> : <Router />}
    </ThemeProvider>
  );
}
