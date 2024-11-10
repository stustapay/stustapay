import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { AuthenticatedRoot, PrivilegeGuard, UnauthenticatedRoot } from "./layout";
import { AccountDetail, AccountPageLayout, FindAccounts, SystemAccountList } from "./routes/accounts";
import { Login, Logout, Profile } from "./routes/auth";
import { CashierCloseOut, CashierDetail, CashierList, CashierShiftDetail } from "./routes/cashiers";
import { EventCreate, NodeOverview, MoneyOverview, NodePageLayout, NodeSettings, NodeCreate } from "./routes/nodes";
import { NodeStats } from "./routes/nodes/stats";
import { OrderDetail, SaleEdit } from "./routes/orders";
import { PayoutRunCreate, PayoutRunDetail, PayoutRunList } from "./routes/payouts";
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
import { TseCreate, TseDetail, TseList, TseUpdate } from "./routes/tse";
import {
  FindUserTags,
  UserTagDetail,
  UserTagPageLayout,
  UserTagsCreate,
  UserTagSecretCreate,
} from "./routes/user-tags";
import {
  UserCreate,
  UserDetail,
  UserList,
  UserPageLayout,
  UserPasswordChange,
  UserRoleCreate,
  UserRoleList,
  UserRoleUpdate,
  UserUpdate,
  UserToRoleList,
  UserToRoleCreate,
  UserRoleDetail,
  UserToRoleUpdate,
} from "./routes/users";
import { SumUpCheckoutList, SumUpPageLayout, SumUpTransactionList, SumUpTransactionDetail } from "./routes/sumup";
import { DsfinvkExport } from "./routes/nodes/DsfinvkExport";
import { CustomerDetail, CustomerOverview, CustomerPageLayout, CustomerSearch } from "./routes/customers";
import { TerminalCreate, TerminalDetail, TerminalList, TerminalUpdate } from "./routes/terminals";
import { SumupOauthCallback } from "./routes/nodes/SumupOauthCallback";
import { NodeProvider } from "./provider";

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
        element: <NodeProvider />,
        children: [
          {
            path: "",
            element: <NodePageLayout />,
            children: [
              { index: true, element: <NodeOverview /> },
              { path: "stats", element: <NodeStats /> },
              {
                path: "settings/sumup-redirect",
                element: <SumupOauthCallback />,
              },
              {
                path: "settings",
                element: <NodeSettings />,
              },
              {
                path: "system-accounts",
                element: <SystemAccountList />,
              },
              {
                path: "payout-runs",
                element: <PayoutRunList />,
              },
              {
                path: "payout-runs/new",
                element: <PayoutRunCreate />,
              },
              {
                path: "payout-runs/:payoutRunId",
                element: <PayoutRunDetail />,
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
                path: "tax-rates/:taxRateId/edit",
                element: <TaxRateUpdate />,
              },
              {
                path: "dsfinvk",
                element: <DsfinvkExport />,
              },
            ],
          },
          {
            path: "create-event",
            element: <EventCreate />,
          },
          {
            path: "create-node",
            element: <NodeCreate />,
          },
          {
            path: "products",
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
            path: "customers",
            element: <CustomerPageLayout />,
            children: [
              {
                index: true,
                element: <CustomerOverview />,
              },
              {
                path: "search",
                element: <CustomerSearch />,
              },
              {
                path: ":customerId",
                element: <CustomerDetail />,
              },
            ],
          },
          {
            path: "sumup",
            element: <SumUpPageLayout />,
            children: [
              {
                index: true,
                element: <SumUpTransactionList />,
              },
              {
                path: "checkouts",
                element: <SumUpCheckoutList />,
              },
              {
                path: ":transactionId",
                element: <SumUpTransactionDetail />,
              },
            ],
          },
          {
            path: "tickets",
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
            path: "cashiers",
            element: <PrivilegeGuard privilege="node_administration" />,
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
            path: "tills",
            element: <TillPageLayout />,
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
            path: "terminals",
            children: [
              {
                index: true,
                element: <TerminalList />,
              },
              {
                path: "new",
                element: <TerminalCreate />,
              },
              {
                path: ":terminalId/edit",
                element: <TerminalUpdate />,
              },
              {
                path: ":terminalId",
                element: <TerminalDetail />,
              },
            ],
          },
          {
            path: "accounts",
            element: (
              <PrivilegeGuard privilege="node_administration">
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
                path: "find",
                element: <FindAccounts />,
              },
            ],
          },
          {
            path: "user-tags",
            element: (
              <PrivilegeGuard privilege="node_administration">
                <UserTagPageLayout />
              </PrivilegeGuard>
            ),
            children: [
              {
                index: true,
                element: <FindUserTags />,
              },
              {
                path: "create-secret",
                element: <UserTagSecretCreate />,
              },
              {
                path: "create-tags",
                element: <UserTagsCreate />,
              },
              {
                path: ":userTagId",
                element: <UserTagDetail />,
              },
            ],
          },
          {
            path: "orders",
            children: [
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
            path: "users",
            element: <UserPageLayout />,
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
                path: "roles/:roleId",
                element: <UserRoleDetail />,
              },
              {
                path: "roles/:roleId/edit",
                element: <UserRoleUpdate />,
              },
              {
                path: ":userId/edit",
                element: <UserUpdate />,
              },
              {
                path: ":userId/change-password",
                element: <UserPasswordChange />,
              },
              {
                path: ":userId",
                element: <UserDetail />,
              },
            ],
          },
          {
            path: "user-to-roles",
            children: [
              {
                index: true,
                element: <UserToRoleList />,
              },
              {
                path: "new",
                element: <UserToRoleCreate />,
              },
              {
                path: ":userId/edit",
                element: <UserToRoleUpdate />,
              },
            ],
          },
          {
            path: "tses",
            element: <PrivilegeGuard privilege="node_administration" />,
            children: [
              {
                index: true,
                element: <TseList />,
              },
              {
                path: "new",
                element: <TseCreate />,
              },
              {
                path: ":tseId/edit",
                element: <TseUpdate />,
              },
              {
                path: ":tseId",
                element: <TseDetail />,
              },
            ],
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
