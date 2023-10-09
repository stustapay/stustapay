import { TillProfile, selectTillProfileAll, useListTillProfilesQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export type TillProfileSelectProps = Omit<
  SelectProps<TillProfile, number, false>,
  "options" | "formatOption" | "multiple" | "getOptionKey"
>;

export const TillProfileSelect: React.FC<TillProfileSelectProps> = (props) => {
  const { currentNode } = useCurrentNode();
  const { profiles } = useListTillProfilesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        profiles: data ? selectTillProfileAll(data) : [],
      }),
    }
  );

  return (
    <Select
      multiple={false}
      options={profiles}
      getOptionKey={(profile: TillProfile) => profile.id}
      formatOption={(profile: TillProfile) => profile.name}
      {...props}
    />
  );
};
