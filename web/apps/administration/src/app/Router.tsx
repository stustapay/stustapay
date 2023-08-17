import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { AuthenticatedRoot, PrivilegeGuard, UnauthenticatedRoot } from "./layout";
import { AccountDetail, AccountPageLayout, FindAccounts, SystemAccountList } from "./routes/accounts";
import { Login, Logout, Profile } from "./routes/auth";
import { CashierCloseOut, CashierDetail, CashierList, CashierShiftDetail } from "./routes/cashiers";
import { FestivalOverview, MoneyOverview, NodePageLayout, Settings, SettingsLegacy } from "./routes/nodes";
import { OrderDetail, OrderList, SaleEdit } from "./routes/orders";
import { ProductCreate, ProductDetail, ProductList, ProductUpdate } from "./routes/products";
import { TaxRateCreate, TaxRateList, TaxRateUpdate } from "./routes/tax-rates";
import { TicketCreate, TicketDetail, TicketList, TicketUpdate } from "./routes/tickets";
import {
  TillButtonCreate,
  TillButtonList,
  TillButtonUpdate,
  TillCreate,
  TillDetail,
  TillLayoutCreate,
  TillLayoutDetail,
  TillLayoutList,
  TillLayoutUpdate,
  TillList,
  TillPageLayout,
  TillProfileCreate,
  TillProfileDetail,
  TillProfileList,
  TillProfileUpdate,
  TillRegisterCreate,
  TillRegisterList,
  TillRegisterStockingCreate,
  TillRegisterStockingList,
  TillRegisterStockingUpdate,
  TillRegisterTransfer,
  TillRegisterUpdate,
  TillUpdate,
} from "./routes/tills";
import { TseDetail, TseList } from "./routes/tse";
import { FindUserTags, UserTagDetail, UserTagPageLayout } from "./routes/user-tags";
import {
  UserCreate,
  UserDetail,
  UserList,
  UserPageLayout,
  UserRoleCreate,
  UserRoleList,
  UserRoleUpdate,
  UserUpdate,
} from "./routes/users";

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
        path: "node/:nodeId",
        element: <NodePageLayout />,
        children: [
          { index: true, element: <FestivalOverview /> },
          { path: "stats", element: <MoneyOverview /> },
          {
            path: "settings-legacy",
            element: <SettingsLegacy />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
        ],
      },
      {
        path: "node/:nodeId/products",
        element: <PrivilegeGuard privilege="product_management" />,
        children: [
          {
            index: true,
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
        path: "node/:nodeId/tickets",
        element: <PrivilegeGuard privilege="product_management" />,
        children: [
          {
            index: true,
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
        path: "node/:nodeId/cashiers",
        element: <PrivilegeGuard privilege="cashier_management" />,
        children: [
          {
            index: true,
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
        path: "node/:nodeId/tax-rates",
        element: <PrivilegeGuard privilege="tax_rate_management" />,
        children: [
          {
            index: true,
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
        path: "node/:nodeId/tills",
        element: (
          <PrivilegeGuard privilege="till_management">
            <TillPageLayout />
          </PrivilegeGuard>
        ),
        children: [
          {
            index: true,
            element: <TillList />,
          },
          {
            path: "profiles",
            element: <TillProfileList />,
          },
          {
            path: "profiles/new",
            element: <TillProfileCreate />,
          },
          {
            path: "profiles/:profileId/edit",
            element: <TillProfileUpdate />,
          },
          {
            path: "profiles/:profileId",
            element: <TillProfileDetail />,
          },
          {
            path: "layouts",
            element: <TillLayoutList />,
          },
          {
            path: "layouts/new",
            element: <TillLayoutCreate />,
          },
          {
            path: "layouts/:layoutId/edit",
            element: <TillLayoutUpdate />,
          },
          {
            path: "layouts/:layoutId",
            element: <TillLayoutDetail />,
          },
          {
            path: "buttons",
            element: <TillButtonList />,
          },
          {
            path: "buttons/new",
            element: <TillButtonCreate />,
          },
          {
            path: "buttons/:buttonId/edit",
            element: <TillButtonUpdate />,
          },
          {
            path: "registers",
            element: <TillRegisterList />,
          },
          {
            path: "registers/new",
            element: <TillRegisterCreate />,
          },
          {
            path: "registers/:registerId/edit",
            element: <TillRegisterUpdate />,
          },
          {
            path: "registers/:registerId/transfer",
            element: <TillRegisterTransfer />,
          },
          {
            path: "stockings",
            element: <TillRegisterStockingList />,
          },
          {
            path: "stockings/new",
            element: <TillRegisterStockingCreate />,
          },
          {
            path: "stockings/:stockingId/edit",
            element: <TillRegisterStockingUpdate />,
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
        path: "node/:nodeId/accounts",
        element: (
          <PrivilegeGuard privilege="account_management">
            <AccountPageLayout />
          </PrivilegeGuard>
        ),
        children: [
          { index: true, element: <MoneyOverview /> },
          {
            path: ":accountId",
            element: <AccountDetail />,
          },
          {
            path: "system",
            element: <SystemAccountList />,
          },
          {
            path: "find",
            element: <FindAccounts />,
          },
        ],
      },
      {
        path: "node/:nodeId/user-tags",
        element: (
          <PrivilegeGuard privilege="account_management">
            <UserTagPageLayout />
          </PrivilegeGuard>
        ),
        children: [
          {
            index: true,
            element: <FindUserTags />,
          },
          {
            path: ":userTagUidHex",
            element: <UserTagDetail />,
          },
        ],
      },
      {
        path: "node/:nodeId/orders",
        element: <PrivilegeGuard privilege="order_management" />,
        children: [
          {
            index: true,
            element: <OrderList />,
          },
          {
            path: ":orderId/edit",
            element: <SaleEdit />,
          },
          {
            path: ":orderId",
            element: <OrderDetail />,
          },
        ],
      },
      {
        path: "node/:nodeId/users",
        element: (
          <PrivilegeGuard privilege="user_management">
            <UserPageLayout />
          </PrivilegeGuard>
        ),
        children: [
          {
            index: true,
            element: <UserList />,
          },
          {
            path: "new",
            element: <UserCreate />,
          },
          {
            path: "roles",
            element: <UserRoleList />,
          },
          {
            path: "roles/new",
            element: <UserRoleCreate />,
          },
          {
            path: "roles/:userId/edit",
            element: <UserRoleUpdate />,
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
        path: "node/:nodeId/tses",
        element: (
          // <PrivilegeGuard privilege="tse_management"/>
          <PrivilegeGuard privilege="till_management" />
        ),
        children: [
          {
            index: true,
            element: <TseList />,
          },
          {
            path: ":tseId",
            element: <TseDetail />,
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
