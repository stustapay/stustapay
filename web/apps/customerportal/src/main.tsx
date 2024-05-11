import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { PersistGate } from "redux-persist/integration/react";
import { Provider as StoreProvider } from "react-redux";
import { store, persistor } from "./store";
import { ModalProvider } from "@stustapay/modal-provider";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "react-toastify/dist/ReactToastify.css";
import "./i18n";
import "./styles.css";

import App from "./app/App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <StoreProvider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <React.Suspense>
          <ModalProvider>
            <App />
          </ModalProvider>
        </React.Suspense>
      </PersistGate>
    </StoreProvider>
  </React.StrictMode>
);
