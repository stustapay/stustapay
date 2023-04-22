import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { PersistGate } from "redux-persist/integration/react";
import { Provider as StoreProvider } from "react-redux";
import { store, persistor } from "./store";
import "react-toastify/dist/ReactToastify.css";
import "./i18n";

import App from "./app/App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <StoreProvider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <React.Suspense>
          <App />
        </React.Suspense>
      </PersistGate>
    </StoreProvider>
  </React.StrictMode>
);
