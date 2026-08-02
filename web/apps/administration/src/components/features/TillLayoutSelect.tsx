import { Select, SelectProps } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";

import { TillLayout } from "@/db/api/generated";
import { getTillLayoutCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export type TillLayoutSelectProps = Omit<SelectProps<TillLayout, false>, "options" | "formatOption" | "multiple">;

export const TillLayoutSelect: React.FC<TillLayoutSelectProps> = (props) => {
  const { currentNode } = useCurrentNode();
  const { data: layouts } = useLiveQuery(
    (q) => q.from({ layouts: getTillLayoutCollection(currentNode.id) }),
    [currentNode.id]
  );

  return (
    <Select multiple={false} options={layouts ?? []} formatOption={(layout: TillLayout) => layout.name} {...props} />
  );
};
