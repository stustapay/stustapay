import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  UserTagVariant,
  selectUserTagVariantAll,
  useDeleteUserTagVariantMutation,
  useListUserTagVariantsQuery,
} from "@/api";
import { UserTagVariantRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useCurrentUserHasPrivilegeAtNode } from "@/hooks";

export const UserTagVariantList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const canManageUserTagVariantsAtNode = useCurrentUserHasPrivilegeAtNode(UserTagVariantRoutes.privilege);
  const openModal = useOpenModal();

  const { userTagVariants, isLoading } = useListUserTagVariantsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        userTagVariants: data ? selectUserTagVariantAll(data) : [],
      }),
    }
  );
  const [deleteUserTagVariant] = useDeleteUserTagVariantMutation();

  const openConfirmDeleteDialog = (userTagVariantId: number) => {
    openModal({
      type: "confirm",
      title: t("userTagVariant.delete"),
      content: t("userTagVariant.deleteDescription"),
      onConfirm: () => {
        deleteUserTagVariant({ nodeId: currentNode.id, userTagVariantId })
          .unwrap()
          .catch(() => undefined);
        return true;
      },
    });
  };

  const columns: GridColDef<UserTagVariant>[] = [
    {
      field: "variant_name",
      headerName: t("userTagVariant.name"),
      width: 160,
    },
    {
      field: "description",
      headerName: t("userTagVariant.description"),
      flex: 1,
    },
    {
      field: "priority",
      headerName: t("userTagVariant.priority"),
      type: "number",
      width: 120,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageUserTagVariantsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(UserTagVariantRoutes.edit(params.row.id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon color="error" />}
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    },
  ];

  return (
    <ListLayout title={t("userTagVariant.title")} routes={UserTagVariantRoutes}>
      <DataGrid
        autoHeight
        loading={isLoading}
        getRowId={(row) => row.id}
        rows={userTagVariants ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
