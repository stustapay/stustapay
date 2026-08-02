import { Link } from "@mui/material";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";

import { CashRegistersRoutes } from "@/app/routes";
import { getCashRegisterCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const CashRegisterCell: React.FC<{
  registerId: number | null | undefined;
  nodeId?: number;
  link?: boolean;
}> = ({ registerId, nodeId, link = true }) => {
  const { currentNode } = useCurrentNode();
  const effectiveNodeId = nodeId ?? currentNode.id;
  const { data: register } = useLiveQuery(
    (q) =>
      q
        .from({ registers: getCashRegisterCollection(effectiveNodeId) })
        .where(({ registers }) => eq(registers.id, registerId ?? -1))
        .findOne(),
    [effectiveNodeId, registerId]
  );

  if (registerId == null || !register) {
    return null;
  }

  if (!link) {
    return register.name;
  }

  return (
    <Link component={RouterLink} to={CashRegistersRoutes.detail(register.id, register.node_id)}>
      {register.name}
    </Link>
  );
};
