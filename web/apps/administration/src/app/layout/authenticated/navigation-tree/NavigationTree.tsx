import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  Event as EventIcon,
  EditOff as EditOffIcon,
} from "@mui/icons-material";
import { SimpleTreeView, TreeViewItemId } from "@mui/x-tree-view";
import * as React from "react";
import { useLocation } from "react-router-dom";

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
    ids.push(...computeMenuIds(child));
  }
  return ids;
};

const matchesMenuPath = (pathname: string, menuPath: string) => {
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`);
};

const findBestMatchingMenuId = (pathname: string, menuIds: string[]) => {
  return menuIds.filter((menuPath) => matchesMenuPath(pathname, menuPath)).toSorted((a, b) => b.length - a.length)[0];
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
    (v: string | null) => {
      dispatch(setSelectedNodes(v));
    },
    [dispatch]
  );

  const handleToggle = (event: React.SyntheticEvent | null, itemIds: TreeViewItemId[]) => {
    setExpanded(itemIds);
  };

  const handleSelect = (event: React.SyntheticEvent | null, itemId: TreeViewItemId | null) => {
    setSelected(itemId);
  };

  const menuIds = React.useMemo(() => computeMenuIds(tree), [tree]);

  React.useEffect(() => {
    const match = location.pathname.match(nodeUrlBaseRegex);
    if (match) {
      const nodeId = match[0];
      const node = findNode(Number(match[1]), tree);
      if (!node) {
        return;
      }
      dispatch(extendExpandedNodes([nodeId, ...node.parent_ids.map((parent) => `/node/${parent}`)]));
      const firstMatchingMenuId = findBestMatchingMenuId(location.pathname, menuIds);
      if (firstMatchingMenuId) {
        setSelected(firstMatchingMenuId);
      } else {
        setSelected(null);
      }
    }
  }, [location, tree, setSelected, dispatch, menuIds]);

  const renderTree = (node: NodeSeenByUser) => (
    <NavigationTreeItem
      key={node.id}
      itemId={`/node/${node.id}`}
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
    <SimpleTreeView
      aria-label="navigation tree"
      slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
      expansionTrigger="iconContainer"
      multiSelect={false}
      expandedItems={expanded}
      selectedItems={selected}
      onExpandedItemsChange={handleToggle}
      onSelectedItemsChange={handleSelect}
      sx={{ flexGrow: 1, overflowX: "auto" }}
    >
      {renderTree(tree)}
    </SimpleTreeView>
  );
};
