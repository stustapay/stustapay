import { ObjectType, Privilege } from "@/api";

export interface IRouteBuilder {
  readonly privilege: Privilege;
  readonly objectType?: ObjectType;
  list: (nodeId?: number) => string;
  add: (nodeId?: number) => string;
  detail: (id?: string | number | null, nodeId?: number) => string;
  edit: (id?: string | number | null, nodeId?: number) => string;
}

export const nodeUrlBaseRegex = /^\/node\/(?<nodeId>[\d]+)/;

class RouteBuilder implements IRouteBuilder {
  constructor(
    private resourceUrl: string,
    public privilege: Privilege,
    public objectType?: ObjectType
  ) {}

  private base = (nodeId?: number | null) => {
    if (nodeId != null) {
      return `/node/${nodeId}/${this.resourceUrl}`;
    }
    const match = window.location.pathname.match(nodeUrlBaseRegex);
    if (!match) {
      return "";
    }
    return `${match[0]}/${this.resourceUrl}`;
  };

  public list = (nodeId?: number | null) => {
    return this.base(nodeId);
  };
  public add = (nodeId?: number | null) => {
    return this.base(nodeId) + `/new`;
  };
  public action = (action: string, nodeId?: number | null) => {
    return `${this.base(nodeId)}/${action}`;
  };
  public edit = (id?: string | number | null, nodeId?: number | null) => {
    return this.base(nodeId) + `/${id}/edit`;
  };
  public detail = (id?: string | number | null, nodeId?: number | null) => {
    return this.base(nodeId) + `/${id}`;
  };

  public detailAction = (id: string | number | undefined | null, suffix: string) => {
    return `${this.detail(id)}/${suffix}`;
  };
}

export const AccountRoutes = new RouteBuilder("accounts", "node_administration", "account");
export const TillRoutes = new RouteBuilder("tills", "node_administration", "till");
export const TillLayoutRoutes = new RouteBuilder("tills/layouts", "node_administration", "till");
export const TillProfileRoutes = new RouteBuilder("tills/profiles", "node_administration", "till");
export const TillButtonsRoutes = new RouteBuilder("tills/buttons", "node_administration", "till");
export const CashRegistersRoutes = new RouteBuilder("tills/registers", "node_administration", "till");
export const TillStockingsRoutes = new RouteBuilder("tills/stockings", "node_administration", "till");
export const UserRoutes = new RouteBuilder("users", "user_management", "user");
export const UserRoleRoutes = new RouteBuilder("users/roles", "user_management", "user_role");
export const UserToRoleRoutes = new RouteBuilder("user-to-roles", "node_administration");
export const TicketRoutes = new RouteBuilder("tickets", "node_administration", "ticket");
export const ExternalTicketRoutes = new RouteBuilder("tickets/external-tickets", "node_administration", "ticket");
export const CashierRoutes = new RouteBuilder("cashiers", "node_administration", "user");
export const ProductRoutes = new RouteBuilder("products", "node_administration", "product");
export const TaxRateRoutes = new RouteBuilder("tax-rates", "node_administration", "tax_rate");
export const UserTagRoutes = new RouteBuilder("user-tags", "node_administration", "user_tag");
export const OrderRoutes = new RouteBuilder("orders", "node_administration", "account");
export const TransactionRoutes = new RouteBuilder("transactions", "node_administration", "account");
export const TseRoutes = new RouteBuilder("tses", "node_administration", "tse");
export const PayoutRunRoutes = new RouteBuilder("payout-runs", "node_administration", "account");
export const SumUpTransactionRoutes = new RouteBuilder("sumup", "node_administration");
export const SumUpCheckoutRoutes = new RouteBuilder("sumup/checkouts", "node_administration");
export const CustomerRoutes = new RouteBuilder("customers", "node_administration", "account");
export const TerminalRoutes = new RouteBuilder("terminals", "node_administration", "terminal");
export const AuditLogRoutes = new RouteBuilder("audit-logs", "node_administration", "account");
