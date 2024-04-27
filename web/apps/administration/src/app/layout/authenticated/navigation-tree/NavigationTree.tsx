import { Node, NodeSeenByUser } from "@/api";
import { findNode, useTreeForCurrentUser } from "@/api/nodes";
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
  const tree = useTreeForCurrentUser();
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

  const renderTree = (node: NodeSeenByUser) => (
    <NavigationTreeItem
      key={node.id}
      nodeId={`/node/${node.id}`}
      to={`/node/${node.id}`}
      labelText={node.name}
      labelIcon={getNavigationTreeItemLabel(node)}
    >
      <NodeMenu node={node} />
      {Array.isArray(node.children) ? node.children.map((node) => renderTree(node)) : null}
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
      {renderTree(tree)}
    </TreeView>
  );
};
