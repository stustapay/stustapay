import * as React from "react";
import { List, ListProps, TopToolbar, ExportButton, FilterButton, SearchInput } from "react-admin";
import CreateButton from "./CreateButton";

export type NodeResourceListProps = ListProps;

const Actions = () => {
  return (
    <TopToolbar>
      <FilterButton />
      <CreateButton />
      <ExportButton />
    </TopToolbar>
  );
};

const defaultListFilters = [<SearchInput source="name" alwaysOn />];

export const NodeResourceList: React.FC<NodeResourceListProps> = (props) => {
  return <List actions={<Actions />} filters={defaultListFilters} {...props} />;
};
