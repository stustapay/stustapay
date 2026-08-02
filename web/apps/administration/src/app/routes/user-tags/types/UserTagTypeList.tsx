import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { ArrayElement } from "@stustapay/utils";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { UserTagVariantRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getUserTagVariantCollection } from "@/db/collections";
import { useCurrentNode, useCurrentUserHasPrivilegeAtNode } from "@/hooks";

export const UserTagVariantList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const canManageUserTagVariantsAtNode = useCurrentUserHasPrivilegeAtNode(UserTagVariantRoutes.privilege);
  const openModal = useOpenModal();

  const { data: userTagVariants, isLoading } = useLiveQuery(
    (q) => q.from({ userTagVariants: getUserTagVariantCollection(currentNode.id) }),
    [currentNode.id]
  );

  const openConfirmDeleteDialog = (userTagVariantId: number) => {
    openModal({
      type: "confirm",
      title: t("userTagVariant.delete"),
      content: t("userTagVariant.deleteDescription"),
      onConfirm: () => {
        getUserTagVariantCollection(currentNode.id).delete(userTagVariantId);
        return true;
      },
    });
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof userTagVariants>>>[] = [
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
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
