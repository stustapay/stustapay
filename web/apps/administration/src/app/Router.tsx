import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { ProductCreate, ProductDetail, ProductList, ProductUpdate } from "./routes/products";
import { TicketCreate, TicketDetail, TicketList, TicketUpdate } from "./routes/tickets";
import { TaxRateCreate, TaxRateList, TaxRateUpdate } from "./routes/tax-rates";
import { AuthenticatedRoot, PrivilegeGuard, UnauthenticatedRoot } from "./layout";
import { Settings } from "./routes/settings/Settings";
import { Login, Logout, Profile } from "./routes/auth";
import {
  TillCreate,
  TillUpdate,
  TillDetail,
  TillList,
  TillLayoutCreate,
  TillLayoutDetail,
  TillLayoutList,
  TillLayoutUpdate,
  TillProfileCreate,
  TillProfileList,
  TillProfileUpdate,
  TillProfileDetail,
  TillButtonList,
  TillButtonCreate,
  TillButtonUpdate,
  TillPageLayout,
  TillRegisterCreate,
  TillRegisterList,
  TillRegisterTransfer,
  TillRegisterUpdate,
  TillRegisterStockingCreate,
  TillRegisterStockingList,
  TillRegisterStockingUpdate,
} from "./routes/tills";
import {
  UserCreate,
  UserDetail,
  UserList,
  UserRoleCreate,
  UserRoleList,
  UserRoleUpdate,
  UserUpdate,
  UserPageLayout,
} from "./routes/users";
import { AccountDetail, FindAccounts, SystemAccountList, AccountPageLayout } from "./routes/accounts";
import { UserTagDetail, UserTagPageLayout, FindUserTags } from "./routes/user-tags";
import { OrderDetail, OrderList, SaleEdit } from "./routes/orders";
import { CashierCloseOut, CashierDetail, CashierList, CashierShiftDetail } from "./routes/cashiers";
import { NodePageLayout, FestivalOverview, MoneyOverview } from "./routes/nodes";

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
