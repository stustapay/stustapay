import { selectTillLayoutAll, useDeleteTillLayoutMutation, useListTillLayoutsQuery } from "@/api";
import { TillLayoutRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { TillLayout } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TillLayoutList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(TillLayoutRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { layouts, isLoading: isTillsLoading } = useListTillLayoutsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        layouts: data ? selectTillLayoutAll(data) : undefined,
      }),
    }
  );
  const [deleteTill] = useDeleteTillLayoutMutation();
  const renderNode = useRenderNode();

  if (isTillsLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (layoutId: number) => {
    openModal({
      type: "confirm",
      title: t("layout.delete"),
      content: t("layout.deleteDescription"),
      onConfirm: () => {
        deleteTill({ nodeId: currentNode.id, layoutId })
          .unwrap()
          .catch(() => undefined);
      },
    });
  };

  const columns: GridColDef<TillLayout>[] = [
    {
      field: "name",
      headerName: t("layout.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TillLayoutRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("layout.description") as string,
      flex: 2,
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: (value) => renderNode(value),
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
          onClick={() => navigate(TillLayoutRoutes.edit(params.row.id))}
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
    <ListLayout title={t("layout.layouts")} routes={TillLayoutRoutes}>
      <DataGrid
        autoHeight
        rows={layouts ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
