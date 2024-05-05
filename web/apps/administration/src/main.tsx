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
import { ModalProvider } from "@stustapay/modal-provider";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { App } from "./app/App";

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
