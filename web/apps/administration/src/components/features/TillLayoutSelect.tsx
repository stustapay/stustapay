import { TillLayout, selectTillLayoutAll, useListTillLayoutsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export type TillLayoutSelectProps = Omit<
  SelectProps<TillLayout, number, false>,
  "options" | "formatOption" | "multiple" | "getOptionKey"
>;

export const TillLayoutSelect: React.FC<TillLayoutSelectProps> = (props) => {
  const { currentNode } = useCurrentNode();
  const { layouts } = useListTillLayoutsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        layouts: data ? selectTillLayoutAll(data) : [],
      }),
    }
  );

  return (
    <Select
      multiple={false}
      options={layouts}
      getOptionKey={(layout: TillLayout) => layout.id}
      formatOption={(layout: TillLayout) => layout.name}
      {...props}
    />
  );
};
