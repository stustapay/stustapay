import { Node } from "@/api";
import { findNode, useNodeTree } from "@/api/nodes";
import { nodeUrlBaseRegex } from "@/app/routes";
import {
  extendExpandedNodes,
  selectExpandedNodes,
  selectSelectedNodes,
  setExpandedNodes,
  setSelectedNodes,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import { TreeView } from "@mui/lab";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { NavigationTreeItem } from "./NavigationTreeItem";
import { NodeMenu } from "./NodeMenu";

const getNavigationTreeItemLabel = (node: Node) => {
  if (node.event) {
    return EventIcon;
  }
  return FolderIcon;
};

export const NavigationTree: React.FC = () => {
  const { root: tree } = useNodeTree();
  const location = useLocation();
  const expanded = useAppSelector(selectExpandedNodes);
  const selected = useAppSelector(selectSelectedNodes);
  const dispatch = useAppDispatch();

  const setExpanded = React.useCallback(
    (v: string[]) => {
      dispatch(setExpandedNodes(v));
    },
    [dispatch]
  );

  const setSelected = React.useCallback(
    (v: string[]) => {
      dispatch(setSelectedNodes(v));
    },
    [dispatch]
  );

  const handleToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  const handleSelect = (event: React.SyntheticEvent, nodeIds: string[]) => {
    setSelected(nodeIds);
  };

  React.useEffect(() => {
    const match = location.pathname.match(nodeUrlBaseRegex);
    if (match) {
      const nodeId = match[0];
      const node = findNode(Number(match[1]), tree);
      if (!node) {
        return;
      }
      dispatch(extendExpandedNodes([nodeId, ...node.parent_ids.map((parent) => `/node/${parent}`)]));
      setSelected([location.pathname]);
    }
  }, [location, tree, setSelected, dispatch]);

  const renderTree = (rootNode: Node) => (
    <NavigationTreeItem
      key={rootNode.id}
      nodeId={`/node/${rootNode.id}`}
      to={`/node/${rootNode.id}`}
      labelText={rootNode.name}
      labelIcon={getNavigationTreeItemLabel(rootNode)}
    >
      <NodeMenu node={rootNode} />
      {Array.isArray(rootNode.children) ? rootNode.children.map((node) => renderTree(node)) : null}
    </NavigationTreeItem>
  );

  return (
    <TreeView
      aria-label="navigation tree"
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      expanded={expanded}
      selected={selected}
      onNodeToggle={handleToggle}
      onNodeSelect={handleSelect}
      sx={{ flexGrow: 1, overflowX: "auto" }}
    >
      {/* we do not explicitly display the root node */}
      {renderTree(tree)}
    </TreeView>
  );
};
