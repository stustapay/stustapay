import { findNode, useNodeTree } from "@/api";
import { GridColDef } from "@stustapay/framework";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const useRenderNode = () => {
  const { t } = useTranslation();
  const { root } = useNodeTree();

  const dataGridNodeColumn = useMemo<GridColDef>(() => {
    const renderNode = (nodeId: number) => {
      const node = findNode(nodeId, root);
      if (!node) {
        return "";
      }

      return node.name;
    };

    return {
      field: "node_id",
      headerName: t("common.definedAtNode"),
      valueFormatter: (value: number) => renderNode(value),
      minWidth: 150,
    };
  }, [root, t]);

  return { dataGridNodeColumn };
};
