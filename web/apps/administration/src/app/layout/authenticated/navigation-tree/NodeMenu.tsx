import { NodeSeenByUserRead } from "@/api";
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
import { useTranslation } from "react-i18next";
import { NavigationTreeItem } from "./NavigationTreeItem";
import {
  CashierRoutes,
  CustomerRoutes,
  ProductRoutes,
  SumUpTransactionRoutes,
  TerminalRoutes,
  TicketRoutes,
  TillRoutes,
  TseRoutes,
  UserRoutes,
  UserTagRoutes,
  UserToRoleRoutes,
} from "@/app/routes";

export interface NodeMenuProps {
  node: NodeSeenByUserRead;
}

export const NodeMenu: React.FC<NodeMenuProps> = React.memo(({ node }) => {
  const { t } = useTranslation();
  const isEvent = node.event != null;

  if (node.computed_forbidden_objects_at_node === undefined) {
    return null;
  }

  const items: React.ReactElement[] = [];

  if (
    !node.computed_forbidden_objects_at_node.includes("user") ||
    !node.computed_forbidden_objects_at_node.includes("user_role")
  ) {
    const id = UserRoutes.list(node.id);
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("users")} labelIcon={PersonIcon} />);
    const cashierId = CashierRoutes.list(node.id);
    items.push(
      <NavigationTreeItem
        key={cashierId}
        nodeId={cashierId}
        to={cashierId}
        labelText={t("cashiers")}
        labelIcon={PersonIcon}
      />
    );
  }

  {
    const id = UserToRoleRoutes.list(node.id);
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("userToRoles")} labelIcon={PersonIcon} />);
  }

  if (!node.computed_forbidden_objects_at_node.includes("product")) {
    const id = ProductRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("products")} labelIcon={ShoppingCartIcon} />
    );
  }
  if (!node.computed_forbidden_objects_at_node.includes("ticket")) {
    const id = TicketRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tickets")} labelIcon={ConfirmationNumberIcon} />
    );
  }
  if (!node.computed_forbidden_objects_at_node.includes("till")) {
    const id = TillRoutes.list(node.id);
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tills")} labelIcon={PointOfSaleIcon} />);
  }
  if (!node.computed_forbidden_objects_at_node.includes("terminal")) {
    const id = TerminalRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("terminal.terminals")} labelIcon={SmartphoneIcon} />
    );
  }
  if (
    node.event != null &&
    node.privileges_at_node.includes("node_administration") &&
    (node.event.sumup_payment_enabled || node.event.sumup_topup_enabled)
  ) {
    const id = SumUpTransactionRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("sumup.sumup")} labelIcon={PaymentIcon} />
    );
  }

  if (isEvent && node.privileges_at_node.includes("node_administration")) {
    const id = CustomerRoutes.list(node.id);
    items.push(
      <NavigationTreeItem
        key={id}
        nodeId={id}
        to={id}
        labelText={t("customer.customers")}
        labelIcon={AccountBalanceIcon}
      />
    );
  }

  if (!node.computed_forbidden_objects_at_node.includes("user_tag")) {
    const id = UserTagRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("userTag.userTags")} labelIcon={NfcIcon} />
    );
  }

  if (
    !node.computed_forbidden_objects_at_node.includes("tse") &&
    node.privileges_at_node.includes("node_administration")
  ) {
    const id = TseRoutes.list(node.id);
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tse.tses")} labelIcon={ShieldIcon} />);
  }

  return <>{items}</>;
});
