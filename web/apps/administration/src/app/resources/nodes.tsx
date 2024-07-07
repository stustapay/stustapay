import { Resource } from "react-admin";
import { Route } from "react-router-dom";
import { ProductCreate, ProductEdit, ProductList, ProductShow } from "./products";
import { TseCreate, TseEdit, TseList, TseShow } from "./tses";
import { TaxRateCreate, TaxRateList, TaxRateShow } from "./taxRates";
import { TicketCreate, TicketEdit, TicketList, TicketShow } from "./tickets";
import { TerminalCreate, TerminalEdit, TerminalList, TerminalShow } from "./terminals";
import {
  TillList,
  TillShow,
  TillProfileList,
  TillProfileShow,
  TillPageLayout,
  TillLayoutShow,
  TillLayoutList,
  TillButtonShow,
  TillButtonList,
  TillRegisterList,
  TillRegisterShow,
  TillRegisterStockingList,
  TillRegisterStockingShow,
} from "./tills";
import { UserList, UserCreate, UserEdit, UserShow } from "./users";
import { UserToRoleCreate, UserToRoleEdit, UserToRoleList, UserToRoleShow } from "./userToRoles";
import { CashierList, CashierShow } from "./cashiers";

const NodeShow = () => {
  return <div>Node show</div>;
};

export const nodeResource = (
  <Resource name="nodes" show={NodeShow}>
    <Route path=":nodeId/products" element={<ProductList />} />
    <Route path=":nodeId/products/create" element={<ProductCreate />} />
    <Route path=":nodeId/products/:id/show" element={<ProductShow />} />
    <Route path=":nodeId/products/:id" element={<ProductEdit />} />
    <Route path=":nodeId/tses" element={<TseList />} />
    <Route path=":nodeId/tses/create" element={<TseCreate />} />
    <Route path=":nodeId/tses/:id/show" element={<TseShow />} />
    <Route path=":nodeId/tses/:id" element={<TseEdit />} />
    <Route path=":nodeId/tax_rates" element={<TaxRateList />} />
    <Route path=":nodeId/tax_rates/create" element={<TaxRateCreate />} />
    <Route path=":nodeId/tax_rates/:id/show" element={<TaxRateShow />} />
    {/* <Route path=":nodeId/tax_rates/:id" element={<TaxRateEdit />} /> */}
    <Route path=":nodeId/tickets" element={<TicketList />} />
    <Route path=":nodeId/tickets/create" element={<TicketCreate />} />
    <Route path=":nodeId/tickets/:id/show" element={<TicketShow />} />
    <Route path=":nodeId/tickets/:id" element={<TicketEdit />} />
    <Route path=":nodeId/terminals" element={<TerminalList />} />
    <Route path=":nodeId/terminals/create" element={<TerminalCreate />} />
    <Route path=":nodeId/terminals/:id/show" element={<TerminalShow />} />
    <Route path=":nodeId/terminals/:id" element={<TerminalEdit />} />
    <Route path=":nodeId/users" element={<UserList />} />
    <Route path=":nodeId/users/create" element={<UserCreate />} />
    <Route path=":nodeId/users/:id/show" element={<UserShow />} />
    <Route path=":nodeId/users/:id" element={<UserEdit />} />
    <Route path=":nodeId/cashiers" element={<CashierList />} />
    <Route path=":nodeId/cashiers/:id/show" element={<CashierShow />} />
    <Route path=":nodeId/user_to_roles" element={<UserToRoleList />} />
    <Route path=":nodeId/user_to_roles/create" element={<UserToRoleCreate />} />
    <Route path=":nodeId/user_to_roles/:id/show" element={<UserToRoleShow />} />
    <Route path=":nodeId/user_to_roles/:id" element={<UserToRoleEdit />} />

    <Route element={<TillPageLayout />}>
      <Route path=":nodeId/tills" element={<TillList />} />
      <Route path=":nodeId/tills/:id/show" element={<TillShow />} />
      <Route path=":nodeId/till_profiles" element={<TillProfileList />} />
      <Route path=":nodeId/till_profiles/:id/show" element={<TillProfileShow />} />
      <Route path=":nodeId/till_layouts" element={<TillLayoutList />} />
      <Route path=":nodeId/till_layouts/:id/show" element={<TillLayoutShow />} />
      <Route path=":nodeId/till_buttons" element={<TillButtonList />} />
      <Route path=":nodeId/till_buttons/:id/show" element={<TillButtonShow />} />
      <Route path=":nodeId/till_registers" element={<TillRegisterList />} />
      <Route path=":nodeId/till_registers/:id/show" element={<TillRegisterShow />} />
      <Route path=":nodeId/till_register_stockings" element={<TillRegisterStockingList />} />
      <Route path=":nodeId/till_register_stockings/:id/show" element={<TillRegisterStockingShow />} />
    </Route>
  </Resource>
);
