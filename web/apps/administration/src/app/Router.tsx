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
import {
  UserUpdate,
  UserDetail,
  UserList,
  UserCreate,
  UserRoleCreate,
  UserRoleList,
  UserRoleUpdate,
} from "./routes/users";
import { SystemAccountList, CustomerAccountDetail, SystemAccountDetail, FindAccounts } from "./routes/accounts";
import { OrderList } from "./routes/orders/OrderList";
import { OrderDetail } from "./routes/orders/OrderDetail";
import { CashierList, CashierDetail } from "./routes/cashiers";
import { CashierCloseOut } from "./routes/cashiers/CashierCloseOut";
import { PrivilegeGuard } from "./routes/PrivilegeGuard";
import {
  TillRegisterStockingList,
  TillRegisterStockingCreate,
  TillRegisterStockingUpdate,
} from "./routes/till-register-stocking";
import { TillRegisterList, TillRegisterCreate } from "./routes/till-registers";

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
        element: <PrivilegeGuard privilege="product_management" />,
        children: [
          {
            path: "",
            element: <ProductList />,
          },
          {
            path: "new",
            element: <ProductCreate />,
          },
          {
            path: ":productId/edit",
            element: <ProductUpdate />,
          },
        ],
      },
      {
        path: "cashiers",
        element: <PrivilegeGuard privilege="cashier_management" />,
        children: [
          {
            path: "",
            element: <CashierList />,
          },
          {
            path: ":cashierId",
            element: <CashierDetail />,
          },
          {
            path: ":cashierId/close-out",
            element: <CashierCloseOut />,
          },
        ],
      },
      {
        path: "tax-rates",
        element: <PrivilegeGuard privilege="tax_rate_management" />,
        children: [
          {
            path: "",
            element: <TaxRateList />,
          },
          {
            path: "new",
            element: <TaxRateCreate />,
          },
          {
            path: ":taxRateName/edit",
            element: <TaxRateUpdate />,
          },
        ],
      },
      {
        path: "tills",
        element: <PrivilegeGuard privilege="till_management" />,
        children: [
          {
            path: "",
            element: <TillList />,
          },
          {
            path: "new",
            element: <TillCreate />,
          },
          {
            path: ":tillId/edit",
            element: <TillUpdate />,
          },
          {
            path: ":tillId",
            element: <TillDetail />,
          },
        ],
      },
      {
        path: "till-buttons",
        element: <PrivilegeGuard privilege="till_management" />,
        children: [
          {
            path: "",
            element: <TillButtonList />,
          },
          {
            path: "new",
            element: <TillButtonCreate />,
          },
          {
            path: ":buttonId/edit",
            element: <TillButtonUpdate />,
          },
        ],
      },
      {
        path: "till-register-stockings",
        element: <PrivilegeGuard privilege="till_management" />,
        children: [
          {
            path: "",
            element: <TillRegisterStockingList />,
          },
          {
            path: "new",
            element: <TillRegisterStockingCreate />,
          },
          {
            path: ":stockingId/edit",
            element: <TillRegisterStockingUpdate />,
          },
        ],
      },
      {
        path: "till-registers",
        element: <PrivilegeGuard privilege="till_management" />,
        children: [
          {
            path: "",
            element: <TillRegisterList />,
          },
          {
            path: "new",
            element: <TillRegisterCreate />,
          },
        ],
      },
      {
        path: "till-layouts",
        element: <PrivilegeGuard privilege="till_management" />,
        children: [
          {
            path: "",
            element: <TillLayoutList />,
          },
          {
            path: "new",
            element: <TillLayoutCreate />,
          },
          {
            path: ":layoutId/edit",
            element: <TillLayoutUpdate />,
          },
          {
            path: ":layoutId",
            element: <TillLayoutDetail />,
          },
        ],
      },
      {
        path: "till-profiles",
        element: <PrivilegeGuard privilege="till_management" />,
        children: [
          {
            path: "",
            element: <TillProfileList />,
          },
          {
            path: "new",
            element: <TillProfileCreate />,
          },
          {
            path: ":profileId/edit",
            element: <TillProfileUpdate />,
          },
          {
            path: ":profileId",
            element: <TillProfileDetail />,
          },
        ],
      },
      {
        path: "system-accounts",
        element: <PrivilegeGuard privilege="account_management" />,
        children: [
          {
            path: "",
            element: <SystemAccountList />,
          },
          {
            path: ":accountId",
            element: <SystemAccountDetail />,
          },
        ],
      },
      {
        path: "customer-accounts",
        element: <PrivilegeGuard privilege="account_management" />,
        children: [
          {
            path: ":accountId",
            element: <CustomerAccountDetail />,
          },
        ],
      },
      {
        path: "find-accounts",
        element: <PrivilegeGuard privilege="account_management" />,
        children: [
          {
            path: "",
            element: <FindAccounts />,
          },
        ],
      },
      {
        path: "orders",
        element: <PrivilegeGuard privilege="order_management" />,
        children: [
          {
            path: "",
            element: <OrderList />,
          },
          {
            path: ":orderId",
            element: <OrderDetail />,
          },
        ],
      },
      {
        path: "settings",
        element: <PrivilegeGuard privilege="config_management" />,
        children: [
          {
            path: "",
            element: <Settings />,
          },
        ],
      },
      {
        path: "users",
        element: <PrivilegeGuard privilege="user_management" />,
        children: [
          {
            path: "",
            element: <UserList />,
          },
          {
            path: "new",
            element: <UserCreate />,
          },
          {
            path: ":userId/edit",
            element: <UserUpdate />,
          },
          {
            path: ":userId",
            element: <UserDetail />,
          },
        ],
      },
      {
        path: "user-roles",
        element: <PrivilegeGuard privilege="user_management" />,
        children: [
          {
            path: "",
            element: <UserRoleList />,
          },
          {
            path: "new",
            element: <UserRoleCreate />,
          },
          {
            path: ":userId/edit",
            element: <UserRoleUpdate />,
          },
        ],
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
