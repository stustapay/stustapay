import { Node } from "@/api";
import {
  AccountBalance as AccountBalanceIcon,
  AddShoppingCart as AddShoppingCartIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Nfc as NfcIcon,
  Percent as PercentIcon,
  Person as PersonIcon,
  PointOfSale as PointOfSaleIcon,
  Shield as ShieldIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { NavigationTreeItem } from "./NavigationTreeItem";

export interface NodeMenuProps {
  node: Node;
}

export const NodeMenu: React.FC<NodeMenuProps> = ({ node }) => {
  const { t } = useTranslation();

  if (node.allowed_objects_at_node === undefined) {
    return null;
  }

  const items: React.ReactElement[] = [];

  if (node.allowed_objects_at_node.includes("user") || node.allowed_objects_at_node.includes("user_role")) {
    const id = `/node/${node.id}/users`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("users")} labelIcon={PersonIcon} />);
    const cashierId = `/node/${node.id}/cashiers`;
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
  if (node.allowed_objects_at_node.includes("tax_rate")) {
    const id = `/node/${node.id}/tax-rates`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("taxRates")} labelIcon={PercentIcon} />);
  }
  if (node.allowed_objects_at_node.includes("product")) {
    const id = `/node/${node.id}/products`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("products")} labelIcon={ShoppingCartIcon} />
    );
  }
  if (node.allowed_objects_at_node.includes("ticket")) {
    const id = `/node/${node.id}/tickets`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tickets")} labelIcon={ConfirmationNumberIcon} />
    );
  }
  if (node.allowed_objects_at_node.includes("till")) {
    const id = `/node/${node.id}/tills`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tills")} labelIcon={PointOfSaleIcon} />);
  }
  if (node.allowed_objects_at_node.includes("account")) {
    const id = `/node/${node.id}/accounts`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("accounts")} labelIcon={AccountBalanceIcon} />
    );
  }
  if (node.allowed_objects_at_node.includes("order")) {
    const id = `/node/${node.id}/orders`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("orders")} labelIcon={AddShoppingCartIcon} />
    );
  }
  if (node.allowed_objects_at_node.includes("user_tags")) {
    const id = `/node/${node.id}/user-tags`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("userTag.userTags")} labelIcon={NfcIcon} />
    );
  }
  if (node.allowed_objects_at_node.includes("tse")) {
    const id = `/node/${node.id}/tses`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tse.tses")} labelIcon={ShieldIcon} />);
  }

  return <>{items}</>;
};