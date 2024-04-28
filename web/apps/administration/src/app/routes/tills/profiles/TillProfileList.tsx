import {
  TillProfile,
  selectTillLayoutById,
  selectTillProfileAll,
  useDeleteTillProfileMutation,
  useListTillLayoutsQuery,
  useListTillProfilesQuery,
} from "@/api";
import { TillProfileRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

export const TillProfileList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageProfiles = useCurrentUserHasPrivilege(TillProfileRoutes.privilege);
  const canManageProfilesAtNode = useCurrentUserHasPrivilegeAtNode(TillProfileRoutes.privilege);
  const navigate = useNavigate();
  const { nodeId } = useParams();

  const { profiles, isLoading: isTillsLoading } = useListTillProfilesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        profiles: data ? selectTillProfileAll(data) : undefined,
      }),
    }
  );
  const { data: layouts, isLoading: isLayoutsLoading } = useListTillLayoutsQuery({ nodeId: currentNode.id });
  const [deleteTillProfile] = useDeleteTillProfileMutation();
  const renderNode = useRenderNode();

  const [profileToDelete, setProfileToDelete] = React.useState<number | null>(null);
  if (isTillsLoading || isLayoutsLoading) {
    return <Loading />;
  }

  const renderLayout = (id: number) => {
    if (!layouts) {
      return "";
    }

    const layout = selectTillLayoutById(layouts, id);
    if (!layout) {
      return "";
    }

    return (
      <Link component={RouterLink} to={`/node/${nodeId}/tills/layouts/${layout.id}`}>
        {layout.name}
      </Link>
    );
  };

  const openConfirmDeleteDialog = (tillId: number) => {
    setProfileToDelete(tillId);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && profileToDelete !== null) {
      deleteTillProfile({ nodeId: currentNode.id, profileId: profileToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setProfileToDelete(null);
  };

  const columns: GridColDef<TillProfile>[] = [
    {
      field: "name",
      headerName: t("profile.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={`/node/${nodeId}/tills/profiles/${params.row.id}`}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("profile.description") as string,
      flex: 2,
    },
    {
      field: "allow_top_up",
      headerName: t("profile.allowTopUp") as string,
      type: "boolean",
      width: 120,
    },
    {
      field: "allow_cash_out",
      headerName: t("profile.allowCashOut") as string,
      type: "boolean",
      width: 120,
    },
    {
      field: "layout",
      headerName: t("profile.layout") as string,
      flex: 0.5,
      renderCell: (params) => renderLayout(params.row.layout_id),
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: ({ value }) => renderNode(value),
      flex: 1,
    },
  ];

  if (canManageProfiles) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) =>
        canManageProfilesAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(`/node/${nodeId}/tills/profiles/${params.row.id}/edit`)}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                color="error"
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("profile.profiles")} routes={TillProfileRoutes}>
      <DataGrid
        autoHeight
        rows={profiles ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("profile.delete")}
        body={t("profile.deleteDescription")}
        show={profileToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </ListLayout>
  );
};
