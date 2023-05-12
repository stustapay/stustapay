import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { PersistGate } from "redux-persist/integration/react";
import { Provider as StoreProvider } from "react-redux";
import { store, persistor } from "./store";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "react-toastify/dist/ReactToastify.css";
import "./i18n";

import App from "./app/App";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <StoreProvider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <React.Suspense>
          <DndProvider backend={HTML5Backend}>
            <App />
          </DndProvider>
        </React.Suspense>
      </PersistGate>
    </StoreProvider>
  </React.StrictMode>
);
