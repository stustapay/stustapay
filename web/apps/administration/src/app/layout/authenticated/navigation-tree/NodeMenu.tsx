import {
  AccountBalance as AccountBalanceIcon,
  AddShoppingCart as AddShoppingCartIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Percent as PercentIcon,
  Nfc as NfcIcon,
} from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { NavigationTreeItem } from "./NavigationTreeItem";
import {
  Person as PersonIcon,
  PointOfSale as PointOfSaleIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mui/icons-material";
import { TreeNode } from "@api/nodes";

export interface NodeMenuProps {
  node: TreeNode;
}

export const NodeMenu: React.FC<NodeMenuProps> = ({ node }) => {
  const { t } = useTranslation();

  if (node.allowedObjectTypes === undefined) {
    return null;
  }

  const items: React.ReactElement[] = [];

  if (node.allowedObjectTypes.includes("user") || node.allowedObjectTypes.includes("user_role")) {
    const id = `/node/${node.id}/users`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("users")} labelIcon={PersonIcon} />);
  }
  if (node.allowedObjectTypes.includes("tax_rate")) {
    const id = `/node/${node.id}/tax-rates`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("taxRates")} labelIcon={PercentIcon} />);
  }
  if (node.allowedObjectTypes.includes("product")) {
    const id = `/node/${node.id}/products`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("products")} labelIcon={ShoppingCartIcon} />
    );
  }
  if (node.allowedObjectTypes.includes("ticket")) {
    const id = `/node/${node.id}/tickets`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tickets")} labelIcon={ConfirmationNumberIcon} />
    );
  }
  if (node.allowedObjectTypes.includes("till")) {
    const id = `/node/${node.id}/tills`;
    items.push(<NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("tills")} labelIcon={PointOfSaleIcon} />);
  }
  if (node.allowedObjectTypes.includes("account")) {
    const id = `/node/${node.id}/accounts`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("accounts")} labelIcon={AccountBalanceIcon} />
    );
  }
  if (node.allowedObjectTypes.includes("order")) {
    const id = `/node/${node.id}/orders`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("orders")} labelIcon={AddShoppingCartIcon} />
    );
  }
  if (node.allowedObjectTypes.includes("user-tags")) {
    const id = `/node/${node.id}/user-tags`;
    items.push(
      <NavigationTreeItem key={id} nodeId={id} to={id} labelText={t("userTag.userTags")} labelIcon={NfcIcon} />
    );
  }

  return <>{items}</>;
};
