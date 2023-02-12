import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { TerminalList } from "./routes/terminals/TerminalList";
import { ProductCreate } from "./routes/products/ProductCreate";
import { ProductUpdate } from "./routes/products/ProductUpdate";
import { ProductList } from "./routes/products/ProductList";
import { TaxRateCreate } from "./routes/tax-rates/TaxRateCreate";
import { TaxRateUpdate } from "./routes/tax-rates/TaxRateUpdate";
import { TaxRateList } from "./routes/tax-rates/TaxRateList";
import { AuthenticatedRoot } from "./routes/AuthenticatedRoot";
import { UserList } from "./routes/users/UserList";
import { Settings } from "./routes/settings/Settings";
import { Login } from "./routes/auth/Login";
import { UnauthenticatedRoot } from "./routes/UnauthenticatedRoot";
import { TerminalCreate } from "./routes/terminals/TerminalCreate";
import { TerminalUpdate } from "./routes/terminals/TerminalUpdate";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthenticatedRoot />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "products",
        element: <ProductList />,
      },
      {
        path: "products/new",
        element: <ProductCreate />,
      },
      {
        path: "products/:productId/edit",
        element: <ProductUpdate />,
      },
      {
        path: "tax-rates",
        element: <TaxRateList />,
      },
      {
        path: "tax-rates/new",
        element: <TaxRateCreate />,
      },
      {
        path: "tax-rates/:taxRateName/edit",
        element: <TaxRateUpdate />,
      },
      {
        path: "terminals",
        element: <TerminalList />,
      },
      {
        path: "terminals/new",
        element: <TerminalCreate />,
      },
      {
        path: "terminals/:terminalId/edit",
        element: <TerminalUpdate />,
      },
      {
        path: "users",
        element: <UserList />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
  {
    element: <UnauthenticatedRoot />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
