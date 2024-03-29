import {
  Till,
  selectTerminalById,
  selectTillAll,
  selectTillProfileById,
  useDeleteTillMutation,
  useListTerminalsQuery,
  useListTillProfilesQuery,
  useListTillsQuery,
} from "@/api";
import { TerminalRoutes, TillProfileRoutes, TillRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TillList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(TillRoutes.privilege);
  const navigate = useNavigate();

  const { tills, isLoading: isTillsLoading } = useListTillsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        tills: data ? selectTillAll(data) : undefined,
      }),
    }
  );
  const { data: profiles, isLoading: isProfilesLoading } = useListTillProfilesQuery({ nodeId: currentNode.id });
  const { data: terminals, isLoading: isTerminalsLoading } = useListTerminalsQuery({ nodeId: currentNode.id });
  const [deleteTill] = useDeleteTillMutation();
  const renderNode = useRenderNode();

  const [tillToDelete, setTillToDelete] = React.useState<number | null>(null);
  if (isTillsLoading || isProfilesLoading || isTerminalsLoading) {
    return <Loading />;
  }

  const renderProfile = (id: number | null) => {
    if (id == null || !profiles) {
      return "";
    }
    const profile = selectTillProfileById(profiles, id);
    if (!profile) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillProfileRoutes.detail(profile.id)}>
        {profile.name}
      </Link>
    );
  };

  const renderTerminal = (id?: number | null) => {
    if (id == null || !terminals) {
      return "";
    }
    const terminal = selectTerminalById(terminals, id);
    if (!terminal) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TerminalRoutes.detail(terminal.id)}>
        {terminal.name}
      </Link>
    );
  };

  const openConfirmDeleteDialog = (tillId: number) => {
    setTillToDelete(tillId);
  };

  const handleConfirmDeleteTill: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && tillToDelete !== null) {
      deleteTill({ nodeId: currentNode.id, tillId: tillToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setTillToDelete(null);
  };

  const columns: GridColDef<Till>[] = [
    {
      field: "name",
      headerName: t("till.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TillRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("till.description") as string,
      flex: 2,
    },
    {
      field: "tse_serial",
      headerName: t("till.tseSerial") as string,
      minWidth: 150,
    },
    {
      field: "profile",
      headerName: t("till.profile") as string,
      flex: 0.5,
      renderCell: (params) => renderProfile(params.row.active_profile_id),
    },
    {
      field: "terminal_id",
      headerName: t("till.terminal") as string,
      flex: 0.5,
      renderCell: (params) => renderTerminal(params.row.terminal_id),
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
          onClick={() => navigate(TillRoutes.edit(params.row.id))}
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
    <ListLayout title={t("tills")} routes={TillRoutes}>
      <DataGrid
        autoHeight
        rows={tills ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("till.delete")}
        body={t("till.deleteDescription")}
        show={tillToDelete !== null}
        onClose={handleConfirmDeleteTill}
      />
    </ListLayout>
  );
};
