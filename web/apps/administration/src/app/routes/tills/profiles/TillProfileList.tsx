import {
  TillProfile,
  selectTillLayoutById,
  selectTillProfileAll,
  useDeleteTillProfileMutation,
  useListTillLayoutsQuery,
  useListTillProfilesQuery,
} from "@/api";
import { TillProfileRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
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
  const openModal = useOpenModal();

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

  const openConfirmDeleteDialog = (profileId: number) => {
    openModal({
      type: "confirm",
      title: t("profile.delete"),
      content: t("profile.deleteDescription"),
      onConfirm: () => {
        deleteTillProfile({ nodeId: currentNode.id, profileId })
          .unwrap()
          .catch(() => undefined);
      },
    });
  };

  const columns: GridColDef<TillProfile>[] = [
    {
      field: "name",
      headerName: t("profile.name"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={`/node/${nodeId}/tills/profiles/${params.row.id}`}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("profile.description"),
      flex: 2,
    },
    {
      field: "allow_top_up",
      headerName: t("profile.allowTopUp"),
      type: "boolean",
      width: 120,
    },
    {
      field: "allow_cash_out",
      headerName: t("profile.allowCashOut"),
      type: "boolean",
      width: 120,
    },
    {
      field: "layout",
      headerName: t("profile.layout"),
      flex: 0.5,
      renderCell: (params) => renderLayout(params.row.layout_id),
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode"),
      valueFormatter: (value) => renderNode(value),
      flex: 1,
    },
  ];

  if (canManageProfiles) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
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
    </ListLayout>
  );
};
