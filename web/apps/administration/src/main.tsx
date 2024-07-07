import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Provider as StoreProvider } from "react-redux";
import "react-toastify/dist/ReactToastify.css";
import { PersistGate } from "redux-persist/integration/react";
import "./i18n";
import { persistor, store } from "./store";
import { authProvider, dataProvider } from "./api";
import { Admin, Logout, UserMenu as RaUserMenu } from "react-admin";
import { useTranslation } from "react-i18next";
import { fetchConfig } from "./api/common";
import {
  taxRateResource,
  productResource,
  tseResource,
  nodeResource,
  ticketResource,
  terminalResource,
  userResource,
  userToRoleResource,
  tillResource,
  tillProfileResource,
  tillLayoutResource,
  tillButtonResource,
  tillRegisterResource,
  tillRegisterStockingResource,
  cashierResource,
} from "./app/resources";
import { Layout } from "./app/layout";
import { useSSPI18nProvider } from "./i18n";
import { MenuItem, MenuList } from "@mui/material";

const SSPConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
  const { t } = useTranslation();
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

  if (loading || error) {
    return null;
  }
  // TODO: proper error page
  return children;
};

const Root = () => {
  const i18nProvider = useSSPI18nProvider();
  if (!i18nProvider) {
    return null;
  }

  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      layout={Layout}
      i18nProvider={i18nProvider}
      disableTelemetry
    >
      {productResource}
      {taxRateResource}
      {tseResource}
      {ticketResource}
      {terminalResource}
      {nodeResource}
      {userResource}
      {cashierResource}
      {userToRoleResource}
      {tillResource}
      {tillProfileResource}
      {tillLayoutResource}
      {tillButtonResource}
      {tillRegisterResource}
      {tillRegisterStockingResource}
    </Admin>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <StoreProvider store={store}>
        <PersistGate persistor={persistor} loading={null}>
          <SSPConfigProvider>
            <Root />
          </SSPConfigProvider>
        </PersistGate>
      </StoreProvider>
    </LocalizationProvider>
  </React.StrictMode>
);
