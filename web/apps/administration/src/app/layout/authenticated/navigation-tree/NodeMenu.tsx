import { Node, NodeSeenByUser, ObjectType, Privilege } from "@/api";
import {
  AccountBalance as AccountBalanceIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Nfc as NfcIcon,
  Person as PersonIcon,
  PointOfSale as PointOfSaleIcon,
  Shield as ShieldIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  Smartphone as SmartphoneIcon,
} from "@mui/icons-material";
import * as React from "react";
import { NavigationTreeItem } from "./NavigationTreeItem";
import { i18n } from "@/i18n";
import { useCreatePath } from "react-admin";

type NodeMenuItem = {
  resource: string;
  icon: React.FC;
  label: string;
  requiresEvent?: boolean;
  requiredPrivileges?: Privilege[];
  requiresOneOfObjectType?: ObjectType[];
  additionalRequirements?: (node: Node) => boolean;
};

export const createMenuRoute = (createPath: ReturnType<typeof useCreatePath>, node: Node, menu: NodeMenuItem) => {
  return createPath({ resource: "nodes", type: "edit", id: node.id }) + `/${menu.resource}`;
};

export const nodeMenuEntryDefinitions: NodeMenuItem[] = [
  {
    resource: "users",
    label: i18n.t("resources.users.name", { count: 2 }),
    icon: PersonIcon,
    requiresOneOfObjectType: ["user", "user_role"],
  },
  {
    resource: "cashiers",
    label: i18n.t("cashiers"),
    icon: PersonIcon,
    requiresOneOfObjectType: ["user", "user_role"],
    requiresEvent: true,
  },
  {
    resource: "user_to_roles",
    label: i18n.t("userToRoles"),
    icon: PersonIcon,
  },
  {
    resource: "products",
    label: i18n.t("resources.products.name", { count: 2 }),
    icon: ShoppingCartIcon,
    requiresOneOfObjectType: ["product"],
  },
  {
    resource: "tickets",
    label: i18n.t("resources.tickets.name", { count: 2 }),
    icon: ConfirmationNumberIcon,
    requiresOneOfObjectType: ["ticket"],
  },
  {
    resource: "terminals",
    label: i18n.t("resources.terminals.name", { count: 2 }),
    icon: SmartphoneIcon,
    requiresOneOfObjectType: ["terminal"],
  },
  {
    resource: "tills",
    label: i18n.t("resources.tills.name", { count: 2 }),
    icon: PointOfSaleIcon,
    requiresOneOfObjectType: ["till"],
  },
  {
    resource: "sumup_transactions",
    label: i18n.t("sumup.sumup"),
    icon: PaymentIcon,
    requiresEvent: true,
    requiredPrivileges: ["node_administration"],
    additionalRequirements: (node) =>
      node.event != null && (node.event.sumup_payment_enabled || node.event.sumup_topup_enabled),
  },
  {
    resource: "customers",
    label: i18n.t("customer.customers"),
    icon: AccountBalanceIcon,
    requiresEvent: true,
    requiredPrivileges: ["node_administration"],
  },
  {
    resource: "user_tags",
    label: i18n.t("userTag.userTags"),
    icon: NfcIcon,
    requiresEvent: true,
    requiresOneOfObjectType: ["user_tag"],
    requiredPrivileges: ["node_administration"],
  },
  {
    resource: "tses",
    label: i18n.t("resources.tses.name", { count: 2 }),
    icon: ShieldIcon,
    requiresEvent: true,
    requiresOneOfObjectType: ["tse"],
    requiredPrivileges: ["node_administration"],
  },
];

export const isMenuEntryValidAtNode = (entry: NodeMenuItem, node: NodeSeenByUser) => {
  const isEvent = node.event != null;

  if (!isEvent && entry.requiresEvent === true) {
    return false;
  }

  if (
    entry.requiresOneOfObjectType != null &&
    entry.requiresOneOfObjectType.length > 0 &&
    entry.requiresOneOfObjectType.every((val) => node.computed_forbidden_objects_at_node.includes(val))
  ) {
    return false;
  }

  if (entry.additionalRequirements != null && !entry.additionalRequirements(node)) {
    return false;
  }

  if (
    entry.requiredPrivileges != null &&
    entry.requiredPrivileges.length > 0 &&
    !entry.requiredPrivileges.every((privilege) => node.privileges_at_node.includes(privilege))
  ) {
    return false;
  }
  return true;
};

export interface NodeMenuProps {
  node: NodeSeenByUser;
}

export const NodeMenu: React.FC<NodeMenuProps> = React.memo(({ node }) => {
  const createPath = useCreatePath();
  if (node.computed_forbidden_objects_at_node === undefined) {
    return null;
  }

  const renderedItems = [];

  for (const menuDefinition of nodeMenuEntryDefinitions) {
    if (!isMenuEntryValidAtNode(menuDefinition, node)) {
      continue;
    }

    const id = createMenuRoute(createPath, node, menuDefinition);

    renderedItems.push(
      <NavigationTreeItem
        key={id}
        itemId={id}
        to={id}
        labelText={menuDefinition.label}
        labelIcon={menuDefinition.icon}
      />
    );
  }

  return renderedItems;
});
