import * as React from "react";
import { CurrencyProvider } from "@stustapay/framework";
import { useCurrentNode } from "@/hooks";
import { findNode, useNodeTree } from "@/api";
import { Outlet } from "react-router-dom";
import { CurrencyIdentifier } from "@stustapay/models";

export const NodeProvider: React.FC = () => {
  const { root } = useNodeTree();
  const { currentNode } = useCurrentNode();

  const settings = React.useMemo(() => {
    if (!currentNode.event) {
      if (currentNode.event_node_id == null) {
        return null;
      }

      const eventNode = findNode(currentNode.event_node_id, root);
      if (eventNode?.event == null) {
        return null;
      }

      return eventNode.event;
    }
    return currentNode.event;
  }, [root, currentNode]);

  if (settings) {
    return (
      <CurrencyProvider currencyIdentifier={settings.currency_identifier as CurrencyIdentifier}>
        <Outlet />
      </CurrencyProvider>
    );
  }

  return <Outlet />;
};
