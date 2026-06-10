import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { ModalProvider } from "@stustapay/modal-provider";
import * as React from "react";
import { DndProvider } from "react-dnd";

import "react-toastify/dist/ReactToastify.css";
import { HTML5Backend } from "react-dnd-html5-backend";

import "./i18n";
import * as ReactDOM from "react-dom/client";
import { Provider as StoreProvider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { App } from "./app/App";
import { persistor, store } from "./store";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <StoreProvider store={store}>
        <PersistGate persistor={persistor} loading={null}>
          <ModalProvider>
            <React.Suspense>
              <DndProvider backend={HTML5Backend}>
                <App />
              </DndProvider>
            </React.Suspense>
          </ModalProvider>
        </PersistGate>
      </StoreProvider>
    </LocalizationProvider>
  </React.StrictMode>
);
