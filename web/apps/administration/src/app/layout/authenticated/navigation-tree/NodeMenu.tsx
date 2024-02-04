import { NodeSeenByUserRead } from "@/api";
import {
  AccountBalance as AccountBalanceIcon,
  AddShoppingCart as AddShoppingCartIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  HistoryEdu as HistoryEduIcon,
  Nfc as NfcIcon,
  Person as PersonIcon,
  PointOfSale as PointOfSaleIcon,
  Shield as ShieldIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { NavigationTreeItem } from "./NavigationTreeItem";
import {
  AccountRoutes,
  CashierRoutes,
  OrderRoutes,
  ProductRoutes,
  SumUpTransactionRoutes,
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

export const NodeMenu: React.FC<NodeMenuProps> = ({ node }) => {
  const { t } = useTranslation();

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
  if (node.event != null && node.privileges_at_node.includes("node_administration")) {
    const id = SumUpTransactionRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("sumup.sumup")} labelIcon={PaymentIcon} />
    );
  }
  if (!node.computed_forbidden_objects_at_node.includes("account")) {
    const id = AccountRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("accounts")} labelIcon={AccountBalanceIcon} />
    );
  }
  if (!node.computed_forbidden_objects_at_node.includes("till")) {
    const id = OrderRoutes.list(node.id);
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("orders")} labelIcon={AddShoppingCartIcon} />
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
  if (
    !node.computed_forbidden_objects_at_node.includes("till") &&
    node.privileges_at_node.includes("node_administration")
  ) {
    const id = `/node/${node.id}/dsfinvk`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("dsfinvk")} labelIcon={HistoryEduIcon} />);
  }

  return <>{items}</>;
};
