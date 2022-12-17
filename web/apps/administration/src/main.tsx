import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { Provider as StoreProvider } from "react-redux";
import { store } from "./store";
import "./i18n";

import App from "./app/App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>
);
