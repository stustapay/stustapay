import { findNode, useTreeForCurrentUser } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Breadcrumbs, Typography } from "@mui/material";
import * as React from "react";
import { RecordRepresentation, Link } from "react-admin";

export const NodeResourceBreadcrumbs: React.FC = () => {
  const tree = useTreeForCurrentUser();
  const { currentNode } = useCurrentNode();

  const nodesTillTop = React.useMemo(() => {
    const nodes = [currentNode];

    let it = currentNode;
    while (it.parent !== tree.id) {
      it = findNode(it.parent, tree)!;
      nodes.push(it);
    }
    nodes.reverse();
    return nodes;
  }, [tree, currentNode]);

  return (
    <Breadcrumbs>
      {nodesTillTop.map((node) => (
        <Link key={node.id} underline="hover" to={`/nodes/${node.id}`}>
          {node.name}
        </Link>
      ))}
      <Typography color="text.primary">
        <RecordRepresentation />
      </Typography>
    </Breadcrumbs>
  );
};
