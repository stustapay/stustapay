import { selectTillButtonAll, useDeleteTillButtonMutation, useListTillButtonsQuery, TillButton } from "@/api";
import { TillButtonsRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode, useRenderNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const TillButtonList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageButtons = useCurrentUserHasPrivilege(TillButtonsRoutes.privilege);
  const canManageButtonsAtNode = useCurrentUserHasPrivilegeAtNode(TillButtonsRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const { buttons, isLoading } = useListTillButtonsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        buttons: data ? selectTillButtonAll(data) : undefined,
      }),
    }
  );
  const [deleteButton] = useDeleteTillButtonMutation();
  const { dataGridNodeColumn } = useRenderNode();

  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (buttonId: number) => {
    openModal({
      type: "confirm",
      title: t("button.delete"),
      content: t("button.deleteDescription"),
      onConfirm: () => {
        deleteButton({ nodeId: currentNode.id, buttonId })
          .unwrap()
          .catch(() => undefined);
        return true;
      },
    });
  };

  const columns: GridColDef<TillButton>[] = [
    {
      field: "name",
      headerName: t("button.name"),
      flex: 1,
    },
    {
      field: "price",
      headerName: t("button.price"),
      type: "currency",
    },
    dataGridNodeColumn,
  ];

  if (canManageButtons) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageButtonsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TillButtonsRoutes.edit(params.row.id, params.row.node_id))}
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
    <ListLayout title={t("button.buttons")} routes={TillButtonsRoutes}>
      <DataGrid
        autoHeight
        getRowId={(row) => row.name}
        rows={buttons ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
