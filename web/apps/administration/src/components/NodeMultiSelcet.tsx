import { NodeSeenByUser } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select } from "@stustapay/components";
import * as React from "react";

export type NodeMultiSelectProps = {
  label: string;
  value: NodeSeenByUser[];
  onChange: (value: NodeSeenByUser[]) => void;
};

export const NodeMultiSelect: React.FC<NodeMultiSelectProps> = ({ onChange, ...props }) => {
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

  const handleChange = React.useCallback(
    (value: NodeSeenByUser[] | null) => {
      onChange(value ?? []);
    },
    [onChange]
  );

  return (
    <Select
      checkboxes={true}
      multiple={true}
      options={options}
      formatOption={(v: NodeSeenByUser) => v.name}
      onChange={handleChange}
      {...props}
    />
  );
};
