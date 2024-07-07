import * as React from "react";
import { NavigationTree } from "./authenticated/navigation-tree";
import { useGetTreeForCurrentUserQuery } from "@/api";
import { Layout as RaLayout } from "react-admin";
import { AppBar } from "./AppBar";

const Menu = () => {
  const { isLoading: isTreeLoading, error: treeError } = useGetTreeForCurrentUserQuery();

  if (isTreeLoading || treeError) {
    return null;
  }

  return (
    // <Menu>
    //   <Menu.DashboardItem />
    //   <Menu.Item to="/products" primaryText="Products" />
    //   <Menu.Item to="/tax_rates" primaryText="Tax Rates" />
    // </Menu>
    <NavigationTree />
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RaLayout menu={Menu} appBar={AppBar}>
      {children}
    </RaLayout>
  );
};
