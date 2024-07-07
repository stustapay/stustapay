import * as React from "react";
import { Edit, EditProps } from "react-admin";
import { useHandleRedirect } from "./useHandleRedirect";

export type NodeResourceEditProps = EditProps;

export const NodeResourceEdit: React.FC<NodeResourceEditProps> = ({ redirect = "show", ...props }) => {
  const handleRedirect = useHandleRedirect(redirect as string);

  return <Edit {...props} mutationMode="pessimistic" redirect={handleRedirect} />;
};
