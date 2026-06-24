import { fetchConfig } from "@/api/common";
import { useAppSelector } from "@/store";
import { selectTheme } from "@/store/uiSlice";
import { createTheme, CssBaseline, PaletteMode, ThemeProvider, Typography, useMediaQuery } from "@mui/material";
import { Loading, MaintenancePage } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ToastContainer } from "react-toastify";
import { UnauthenticatedLayout } from "./layout/UnauthenticatedLayout";
import { Router } from "./Router";

const TEAMFESTLICHPAY_LOGO_URL =
  "https://www.teamfestlichpay.de/fileadmin/user_upload/images/logos/logo_teamfestlichpay_tfpay.png";

export function App() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
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
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UnauthenticatedLayout
          toolbar={
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {t("TeamFestlichPay")}
            </Typography>
          }
        >
          <MaintenancePage
            brandName={t("errorPage.brand")}
            title={t("errorPage.maintenance")}
            message={t("errorPage.currentlyUnavailable")}
            logoSrc={TEAMFESTLICHPAY_LOGO_URL}
          />
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
