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
  EditOff as EditOffIcon,
} from "@mui/icons-material";
import { TreeView } from "@mui/lab";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { NavigationTreeItem } from "./NavigationTreeItem";
import { NodeMenu, isMenuEntryValidAtNode, nodeMenuEntryDefinitions } from "./NodeMenu";

const getNavigationTreeItemLabel = (node: Node) => {
  if (node.event) {
    return EventIcon;
  }
  return FolderIcon;
};

const computeMenuIds = (node: NodeSeenByUser) => {
  let ids = [`/node/${node.id}`];
  for (const menuEntry of nodeMenuEntryDefinitions) {
    if (isMenuEntryValidAtNode(menuEntry, node)) {
      const id = menuEntry.route(node);
      ids.push(id);
    }
  }
  for (const child of node.children) {
    ids = [...ids, ...computeMenuIds(child)];
  }
  return ids;
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

  const menuIds = React.useMemo(() => {
    const result = computeMenuIds(tree);
    result.sort().reverse();
    return result;
  }, [tree]);

  React.useEffect(() => {
    const match = location.pathname.match(nodeUrlBaseRegex);
    if (match) {
      const nodeId = match[0];
      const node = findNode(Number(match[1]), tree);
      if (!node) {
        return;
      }
      dispatch(extendExpandedNodes([nodeId, ...node.parent_ids.map((parent) => `/node/${parent}`)]));
      const firstMatchingMenuId = menuIds.find((val) => location.pathname.startsWith(val));
      if (firstMatchingMenuId) {
        setSelected([firstMatchingMenuId]);
      } else {
        setSelected([]);
      }
    }
  }, [location, tree, setSelected, dispatch, menuIds]);

  const renderTree = (node: NodeSeenByUser) => (
    <NavigationTreeItem
      key={node.id}
      nodeId={`/node/${node.id}`}
      to={`/node/${node.id}`}
      labelText={node.name}
      labelIcon={getNavigationTreeItemLabel(node)}
      suffixIcon={node.read_only ? EditOffIcon : undefined}
    >
      <NodeMenu node={node} />
      {node.children.map((node) => renderTree(node))}
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
