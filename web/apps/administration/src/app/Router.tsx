import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { TillList } from "./routes/tills/TillList";
import { ProductCreate } from "./routes/products/ProductCreate";
import { ProductUpdate } from "./routes/products/ProductUpdate";
import { ProductList } from "./routes/products/ProductList";
import { TaxRateCreate } from "./routes/tax-rates/TaxRateCreate";
import { TaxRateUpdate } from "./routes/tax-rates/TaxRateUpdate";
import { TaxRateList } from "./routes/tax-rates/TaxRateList";
import { AuthenticatedRoot } from "./routes/AuthenticatedRoot";
import { Settings } from "./routes/settings/Settings";
import { Login } from "./routes/auth/Login";
import { UnauthenticatedRoot } from "./routes/UnauthenticatedRoot";
import { TillCreate } from "./routes/tills/TillCreate";
import { TillUpdate } from "./routes/tills/TillUpdate";
import { Logout } from "./routes/auth/Logout";
import { TillDetail } from "./routes/tills/TillDetail";
import { TillLayoutCreate, TillLayoutUpdate, TillLayoutList, TillLayoutDetail } from "./routes/till-layouts";
import { TillProfileCreate, TillProfileUpdate, TillProfileList } from "./routes/till-profiles";
import { TillProfileDetail } from "./routes/till-profiles/TillProfileDetail";
import { TillButtonUpdate } from "./routes/till-buttons/TillButtonUpdate";
import { TillButtonCreate } from "./routes/till-buttons/TillButtonCreate";
import { TillButtonList } from "./routes/till-buttons/TillButtonList";
import { UserUpdate, UserDetail, UserList, UserCreate } from "./routes/users";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthenticatedRoot />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "logout",
        element: <Logout />,
      },
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
        path: "tills",
        element: <TillList />,
      },
      {
        path: "tills/new",
        element: <TillCreate />,
      },
      {
        path: "tills/:tillId/edit",
        element: <TillUpdate />,
      },
      {
        path: "tills/:tillId",
        element: <TillDetail />,
      },
      {
        path: "till-buttons",
        element: <TillButtonList />,
      },
      {
        path: "till-buttons/new",
        element: <TillButtonCreate />,
      },
      {
        path: "till-buttons/:buttonId/edit",
        element: <TillButtonUpdate />,
      },
      {
        path: "till-layouts",
        element: <TillLayoutList />,
      },
      {
        path: "till-layouts/new",
        element: <TillLayoutCreate />,
      },
      {
        path: "till-layouts/:layoutId/edit",
        element: <TillLayoutUpdate />,
      },
      {
        path: "till-layouts/:layoutId",
        element: <TillLayoutDetail />,
      },
      {
        path: "till-profiles",
        element: <TillProfileList />,
      },
      {
        path: "till-profiles/new",
        element: <TillProfileCreate />,
      },
      {
        path: "till-profiles/:profileId/edit",
        element: <TillProfileUpdate />,
      },
      {
        path: "till-profiles/:profileId",
        element: <TillProfileDetail />,
      },
      {
        path: "users/new",
        element: <UserCreate />,
      },
      {
        path: "users/:userId/edit",
        element: <UserUpdate />,
      },
      {
        path: "users/:userId",
        element: <UserDetail />,
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
