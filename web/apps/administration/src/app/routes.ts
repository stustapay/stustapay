export interface IRouteBuilder {
    list: () => string;
    add: () => string;
    detail: (id?: string | number) => string;
    edit: (id?: string | number) => string;
    base: () => string;
}

export const nodeUrlBaseRegex = /^\/node\/(?<nodeId>[\w-]+)/

class RouteBuilder implements IRouteBuilder {
    constructor(private resourceUrl: string) {}

    public base = () => {
        const match = window.location.pathname.match(nodeUrlBaseRegex);
        if (!match) {
            return "";
        }
        return `${match[0]}/${this.resourceUrl}`;
    }

    public list = () =>  {
        return this.base();
    }
    public add = () =>  {
        return this.base() + `/add`;
    }
    public edit = (id?: string | number) =>  {
        return this.base() + `/${id}/edit`;
    }
    public detail = (id?: string | number) =>  {
        return this.base() + `/${id}`;
    }
}

export const AccountRoutes = new RouteBuilder("accounts")
export const TillRoutes = new RouteBuilder("tills")
export const TillLayoutRoutes = new RouteBuilder("tills/layouts")
export const TillProfileRoutes = new RouteBuilder("tills/profiles")
export const TillButtonsRoutes = new RouteBuilder("tills/buttons")
export const TillRegistersRoutes = new RouteBuilder("tills/registers")
export const TillStockingsRoutes = new RouteBuilder("tills/stockings")
export const UserRoutes = new RouteBuilder("users")
export const UserRoleRoutes = new RouteBuilder("users/roles")
export const TicketRoutes = new RouteBuilder("tickets")
export const CashierRoutes = new RouteBuilder("cashiers")
export const ProductRoutes = new RouteBuilder("products")
export const TaxRateRoutes = new RouteBuilder("tax-rates")
export const UserTagRoutes = new RouteBuilder("user-tags")
export const OrderRoutes = new RouteBuilder("orders")