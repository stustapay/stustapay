import { Node, NodeSeenByUserRead } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select } from "@stustapay/components";
import * as React from "react";

export type NodeSelectProps = {
  label: string;
  value: NodeSeenByUserRead;
  onChange: (value: NodeSeenByUserRead | null) => void;
};

export const NodeSelect: React.FC<NodeSelectProps> = ({ ...props }) => {
  const { currentNode } = useCurrentNode();

  const options = React.useMemo(() => {
    let result: NodeSeenByUserRead[] = [currentNode];
    let next: NodeSeenByUserRead[] = [currentNode];
    for (let curr = next.pop(); curr !== undefined; curr = next.pop()) {
      result = result.concat(curr.children);
      next = next.concat(curr.children);
    }
    return result;
  }, [currentNode]);

  return <Select multiple={false} options={options} formatOption={(v: Node) => v.name} {...props} />;
};
