import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { TillList } from "./routes/tills/TillList";
import { ProductCreate, ProductDetail, ProductList, ProductUpdate } from "./routes/products";
import { TicketCreate, TicketDetail, TicketList, TicketUpdate } from "./routes/tickets";
import { TaxRateCreate, TaxRateList, TaxRateUpdate } from "./routes/tax-rates";
import { AuthenticatedRoot } from "./routes/AuthenticatedRoot";
import { Settings } from "./routes/settings/Settings";
import { Login } from "./routes/auth/Login";
import { UnauthenticatedRoot } from "./routes/UnauthenticatedRoot";
import { TillCreate } from "./routes/tills/TillCreate";
import { TillUpdate } from "./routes/tills/TillUpdate";
import { Logout } from "./routes/auth/Logout";
import { TillDetail } from "./routes/tills/TillDetail";
import { TillLayoutCreate, TillLayoutDetail, TillLayoutList, TillLayoutUpdate } from "./routes/till-layouts";
import { TillProfileCreate, TillProfileList, TillProfileUpdate } from "./routes/till-profiles";
import { TillProfileDetail } from "./routes/till-profiles/TillProfileDetail";
import { TillButtonUpdate } from "./routes/till-buttons/TillButtonUpdate";
import { TillButtonCreate } from "./routes/till-buttons/TillButtonCreate";
import { TillButtonList } from "./routes/till-buttons/TillButtonList";
import {
  UserCreate,
  UserDetail,
  UserList,
  UserRoleCreate,
  UserRoleList,
  UserRoleUpdate,
  UserUpdate,
} from "./routes/users";
import {
  CustomerAccountDetail,
  FindAccounts,
  SystemAccountDetail,
  SystemAccountList,
  UserTagDetail,
} from "./routes/accounts";
import { OrderList } from "./routes/orders/OrderList";
import { OrderDetail } from "./routes/orders/OrderDetail";
import { CashierCloseOut, CashierDetail, CashierList, CashierShiftDetail } from "./routes/cashiers";
import { PrivilegeGuard } from "./routes/PrivilegeGuard";
import {
  TillRegisterStockingCreate,
  TillRegisterStockingList,
  TillRegisterStockingUpdate,
} from "./routes/till-register-stocking";
import { TillRegisterCreate, TillRegisterList, TillRegisterUpdate } from "./routes/till-registers";
import { FestivalOverview, MoneyOverview } from "./routes/overview";
import { Profile } from "./routes/auth";

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
        path: "profile",
        element: <Profile />,
      },
      {
        path: "overview",
        children: [
          {
            path: "money",
            element: (
              <PrivilegeGuard privilege="account_management">
                <MoneyOverview />
              </PrivilegeGuard>
            ),
          },
          {
            path: "festival",
            element: (
              <PrivilegeGuard privilege="festival_overview">
                <FestivalOverview />
              </PrivilegeGuard>
            ),
          },
        ],
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
          {
            path: ":productId",
            element: <ProductDetail />,
          },
        ],
      },
      {
        path: "tickets",
        element: <PrivilegeGuard privilege="product_management" />,
        children: [
          {
            path: "",
            element: <TicketList />,
          },
          {
            path: "new",
            element: <TicketCreate />,
          },
          {
            path: ":ticketId/edit",
            element: <TicketUpdate />,
          },
          {
            path: ":ticketId",
            element: <TicketDetail />,
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
          {
            path: ":cashierId/shifts/:shiftId",
            element: <CashierShiftDetail />,
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
          {
            path: ":registerId/edit",
            element: <TillRegisterUpdate />,
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
        path: "user-tags",
        element: <PrivilegeGuard privilege="account_management" />,
        children: [
          {
            path: ":userTagUidHex",
            element: <UserTagDetail />,
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
