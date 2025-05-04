import { NodeSeenByUser } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select } from "@stustapay/components";
import * as React from "react";

export type NodeSelectProps = {
  label: string;
  value: NodeSeenByUser;
  onChange: (value: NodeSeenByUser | null) => void;
};

export const NodeSelect: React.FC<NodeSelectProps> = ({ ...props }) => {
  const { currentNode } = useCurrentNode();

  const options = React.useMemo(() => {
    let result: NodeSeenByUser[] = [currentNode];
    let next: NodeSeenByUser[] = [currentNode];
    for (let curr = next.pop(); curr !== undefined; curr = next.pop()) {
      result = result.concat(curr.children);
      next = next.concat(curr.children);
    }
    return result;
  }, [currentNode]);

  return <Select multiple={false} options={options} formatOption={(v: NodeSeenByUser) => v.name} {...props} />;
};
