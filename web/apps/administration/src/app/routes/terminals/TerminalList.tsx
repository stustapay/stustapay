import {
  Terminal,
  selectTerminalAll,
  selectTillById,
  useDeleteTerminalMutation,
  useListTerminalsQuery,
  useListTillsQuery,
} from "@/api";
import { TerminalRoutes, TillRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TerminalList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(TerminalRoutes.privilege);
  const navigate = useNavigate();

  const { terminals, isLoading: isTerminalsLoading } = useListTerminalsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        terminals: data ? selectTerminalAll(data) : undefined,
      }),
    }
  );
  const { data: tills, isLoading: isTillsLoading } = useListTillsQuery({ nodeId: currentNode.id });
  const [deleteTerminal] = useDeleteTerminalMutation();
  const renderNode = useRenderNode();

  const [terminalToDelete, setTerminalToDelete] = React.useState<number | null>(null);
  if (isTerminalsLoading || isTillsLoading) {
    return <Loading />;
  }

  const renderTill = (id: number | null) => {
    if (id == null || !tills) {
      return "";
    }
    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillRoutes.detail(till.id)}>
        {till.name}
      </Link>
    );
  };

  const openConfirmDeleteDialog = (terminalId: number) => {
    setTerminalToDelete(terminalId);
  };

  const handleConfirmDeleteTerminal: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && terminalToDelete !== null) {
      deleteTerminal({ nodeId: currentNode.id, terminalId: terminalToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setTerminalToDelete(null);
  };

  const columns: GridColDef<Terminal>[] = [
    {
      field: "name",
      headerName: t("common.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TerminalRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("common.description") as string,
      flex: 2,
    },
    {
      field: "till_id",
      headerName: t("terminal.till") as string,
      flex: 0.5,
      renderCell: (params) => renderTill(params.row.till_id),
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: ({ value }) => renderNode(value),
      flex: 1,
    },
  ];

  if (canManageNode) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(TerminalRoutes.edit(params.row.id))}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    });
  }

  return (
    <ListLayout title={t("terminal.terminals")} routes={TerminalRoutes}>
      <DataGrid
        autoHeight
        rows={terminals ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("terminal.delete")}
        body={t("terminal.deleteDescription")}
        show={terminalToDelete !== null}
        onClose={handleConfirmDeleteTerminal}
      />
    </ListLayout>
  );
};
