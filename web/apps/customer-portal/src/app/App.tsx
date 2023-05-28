import * as React from "react";
import { useMediaQuery, PaletteMode, createTheme, ThemeProvider, CssBaseline, Box, Link } from "@mui/material";
import { Router } from "./Router";
import { toast, ToastContainer } from "react-toastify";
import { useAppSelector, selectTheme, selectIsAuthenticated } from "@/store";
import { Loading } from "@stustapay/components";
import { fetchConfig } from "@/api/common";
import { LoggedInFooter } from "./LoggedInFooter";
import { LoggedOutFooter } from "./LoggedOutFooter";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useTranslation } from "react-i18next";

export function App() {
  const [loading, setLoading] = React.useState(true);
  const darkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
  const themeModeStore = useAppSelector(selectTheme);
  const authenticated = useAppSelector(selectIsAuthenticated);
  const { t } = useTranslation();

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

  function AboutLink() {
    const config = usePublicConfig();
    return (
      <Link href={config.about_page_url} target="_blank">
        {t("about")}
      </Link>
    );
  }
  function GithubLink() {
    return (
      <Link sx={{ ml: 4 }} href="https://github.com/stustanet/stustapay" target="_blank">
        Github
      </Link>
    );
  }

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
        <Box
          component="footer"
          sx={{
            py: 2,
            px: 4,
            backgroundColor: theme.palette.background.default,
            borderTop: `1px solid ${theme.palette.divider}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: theme.palette.common.white,
          }}
        >
          {loading ? (
            <Loading />
          ) : (
            <>
              <AboutLink />
              {authenticated ? <LoggedInFooter theme={theme} /> : <LoggedOutFooter theme={theme} />}
              <GithubLink />
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
