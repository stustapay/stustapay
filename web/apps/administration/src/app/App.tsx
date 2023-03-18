import * as React from "react";
import { useMediaQuery, PaletteMode, createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { Router } from "./Router";
import { ToastContainer } from "react-toastify";
import { useAppSelector } from "@store";
import { selectTheme } from "@store/uiSlice";

export function App() {
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer position="top-right" autoClose={4000} pauseOnFocusLoss={false} theme={themeMode} />
      <Router />
    </ThemeProvider>
  );
}

export default App;
