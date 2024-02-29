import { Privilege } from "@/api";

export interface IRouteBuilder {
  readonly privilege: Privilege;
  list: (nodeId?: number) => string;
  add: (nodeId?: number) => string;
  detail: (id?: string | number | null, nodeId?: number) => string;
  edit: (id?: string | number | null, nodeId?: number) => string;
}

export const nodeUrlBaseRegex = /^\/node\/(?<nodeId>[\d]+)/;

class RouteBuilder implements IRouteBuilder {
  constructor(
    private resourceUrl: string,
    public privilege: Privilege
  ) {}

  private base = (nodeId?: number) => {
    if (nodeId !== undefined) {
      return `/node/${nodeId}/${this.resourceUrl}`;
    }
    const match = window.location.pathname.match(nodeUrlBaseRegex);
    if (!match) {
      return "";
    }
    return `${match[0]}/${this.resourceUrl}`;
  };

  public list = (nodeId?: number) => {
    return this.base(nodeId);
  };
  public add = (nodeId?: number) => {
    return this.base(nodeId) + `/new`;
  };
  public action = (action: string, nodeId?: number) => {
    return `${this.base(nodeId)}/${action}`;
  };
  public edit = (id?: string | number | null, nodeId?: number) => {
    return this.base(nodeId) + `/${id}/edit`;
  };
  public detail = (id?: string | number | null, nodeId?: number) => {
    return this.base(nodeId) + `/${id}`;
  };

  public detailAction = (id: string | number | undefined | null, suffix: string) => {
    return `${this.detail(id)}/${suffix}`;
  };
}

export const AccountRoutes = new RouteBuilder("accounts", "node_administration");
export const TillRoutes = new RouteBuilder("tills", "node_administration");
export const TillLayoutRoutes = new RouteBuilder("tills/layouts", "node_administration");
export const TillProfileRoutes = new RouteBuilder("tills/profiles", "node_administration");
export const TillButtonsRoutes = new RouteBuilder("tills/buttons", "node_administration");
export const TillRegistersRoutes = new RouteBuilder("tills/registers", "node_administration");
export const TillStockingsRoutes = new RouteBuilder("tills/stockings", "node_administration");
export const UserRoutes = new RouteBuilder("users", "user_management");
export const UserRoleRoutes = new RouteBuilder("users/roles", "user_management");
export const UserToRoleRoutes = new RouteBuilder("user-to-roles", "node_administration");
export const TicketRoutes = new RouteBuilder("tickets", "node_administration");
export const CashierRoutes = new RouteBuilder("cashiers", "node_administration");
export const ProductRoutes = new RouteBuilder("products", "node_administration");
export const TaxRateRoutes = new RouteBuilder("tax-rates", "node_administration");
export const UserTagRoutes = new RouteBuilder("user-tags", "node_administration");
export const OrderRoutes = new RouteBuilder("orders", "node_administration");
export const TseRoutes = new RouteBuilder("tses", "node_administration");
export const PayoutRunRoutes = new RouteBuilder("payout-runs", "node_administration");
export const SumUpTransactionRoutes = new RouteBuilder("sumup", "node_administration");
export const SumUpCheckoutRoutes = new RouteBuilder("sumup/checkouts", "node_administration");
export const CustomerRoutes = new RouteBuilder("customers", "node_administration");
