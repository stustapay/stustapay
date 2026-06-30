import {
  AccountBalance as AccountBalanceIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
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

import { EventPrivilege, Node, NodePrivilege, NodeSeenByUser, ObjectType } from "@/api";
import {
  CustomerRoutes,
  ProductRoutes,
  SumUpTransactionRoutes,
  TerminalRoutes,
  TicketRoutes,
  TillRoutes,
  TseRoutes,
  UserRoleRoutes,
  UserRoutes,
  UserTagRoutes,
  UserToRoleRoutes,
} from "@/app/routes";
import { i18n } from "@/i18n";

import { NavigationTreeItem } from "./NavigationTreeItem";

type NodeMenuItem = {
  route: (node: Node) => string;
  icon: React.FC;
  label: string;
  requiresEvent?: boolean;
  requiredPrivileges?: (EventPrivilege | NodePrivilege)[];
  requiresOneOfObjectType?: ObjectType[];
  additionalRequirements?: (node: Node) => boolean;
};

export const nodeMenuEntryDefinitions: NodeMenuItem[] = [
  {
    route: (node) => UserRoutes.list(node.id),
    label: i18n.t("users"),
    icon: PersonIcon,
    requiresOneOfObjectType: ["user"],
  },
  {
    route: (node) => UserRoleRoutes.list(node.id),
    label: i18n.t("userRoles"),
    icon: AdminPanelSettingsIcon,
    requiresOneOfObjectType: ["user_role"],
  },
  {
    route: (node) => UserToRoleRoutes.list(node.id),
    label: i18n.t("userToRoles"),
    icon: AdminPanelSettingsIcon,
  },
  {
    route: (node) => ProductRoutes.list(node.id),
    label: i18n.t("products"),
    icon: ShoppingCartIcon,
    requiresOneOfObjectType: ["product"],
  },
  {
    route: (node) => TicketRoutes.list(node.id),
    label: i18n.t("tickets"),
    icon: ConfirmationNumberIcon,
    requiresOneOfObjectType: ["ticket"],
  },
  {
    route: (node) => TerminalRoutes.list(node.id),
    label: i18n.t("terminal.terminals"),
    icon: SmartphoneIcon,
    requiresOneOfObjectType: ["terminal"],
  },
  {
    route: (node) => TillRoutes.list(node.id),
    label: i18n.t("tills"),
    icon: PointOfSaleIcon,
    requiresOneOfObjectType: ["till"],
  },
  {
    route: (node) => SumUpTransactionRoutes.list(node.id),
    label: i18n.t("sumup.sumup"),
    icon: PaymentIcon,
    requiresEvent: true,
    requiredPrivileges: ["node_administration"],
    additionalRequirements: (node) =>
      node.event != null && (node.event.sumup_payment_enabled || node.event.sumup_topup_enabled),
  },
  {
    route: (node) => CustomerRoutes.list(node.id),
    label: i18n.t("customer.customers"),
    icon: AccountBalanceIcon,
    requiresEvent: true,
    requiredPrivileges: ["node_administration"],
  },
  {
    route: (node) => UserTagRoutes.list(node.id),
    label: i18n.t("userTag.userTags"),
    icon: NfcIcon,
    requiresEvent: true,
    requiresOneOfObjectType: ["user_tag"],
    requiredPrivileges: ["node_administration"],
  },
  {
    route: (node) => TseRoutes.list(node.id),
    label: i18n.t("tse.tses"),
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
    !entry.requiredPrivileges.every(
      (privilege) =>
        node.node_privileges_at_node.includes(privilege as NodePrivilege) ||
        node.event_privileges_at_node.includes(privilege as EventPrivilege)
    )
  ) {
    return false;
  }
  return true;
};

export interface NodeMenuProps {
  node: NodeSeenByUser;
}

export const NodeMenu: React.FC<NodeMenuProps> = React.memo(({ node }) => {
  if (node.computed_forbidden_objects_at_node === undefined) {
    return null;
  }

  const renderedItems = [];

  for (const menuDefinition of nodeMenuEntryDefinitions) {
    if (!isMenuEntryValidAtNode(menuDefinition, node)) {
      continue;
    }

    const id = menuDefinition.route(node);

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
