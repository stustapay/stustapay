import { Edit as EditIcon } from "@mui/icons-material";
import * as React from "react";
import { Datagrid, DatagridProps, Identifier, RaRecord, useRecordContext, useResourceContext } from "react-admin";
import { useCreateNodePath } from "./useCreateNodePath";
import { IconButtonLink } from "@/components";
import { useHandleRedirect } from "./useHandleRedirect";
import { DeleteIconButton } from "./DeleteIconButton";

export type NodeResourceDatagridProps = DatagridProps & { hideActions?: boolean };

const TableActions = () => {
  const resource = useResourceContext();
  const record = useRecordContext();
  const createPath = useCreateNodePath();
  const handleRedirect = useHandleRedirect();

  if (!resource || !record) {
    return null;
  }

  return (
    <>
      <IconButtonLink
        color="primary"
        size="small"
        to={createPath({ type: "edit", resource: resource, id: record.id, nodeId: record.node_id })}
      >
        <EditIcon fontSize="small" />
      </IconButtonLink>
      <DeleteIconButton redirect={handleRedirect} />
    </>
  );
};

export const NodeResourceDatagrid: React.FC<NodeResourceDatagridProps> = ({
  children,
  hideActions = false,
  bulkActionButtons,
  ...props
}) => {
  const createPath = useCreateNodePath();
  const handleRowClick = React.useCallback(
    (id: Identifier, resource: string, record: RaRecord) => {
      return createPath({ type: "show", resource, id, nodeId: record.node_id });
    },
    [createPath]
  );

  return (
    <Datagrid rowClick={handleRowClick} bulkActionButtons={hideActions ? false : bulkActionButtons} {...props}>
      {children}
      {!hideActions && <TableActions />}
    </Datagrid>
  );
};
